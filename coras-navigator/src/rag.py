# Load documents
from langchain_core.documents import Document
# Vector Store
# from langchain_community.vectorstores import FAISS
from langchain_chroma import Chroma
# Models
from langchain_ollama import ChatOllama, OllamaEmbeddings

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser   

import os
import re
from uuid import uuid4
import json

class DocumentExtension:
    CSV = "CSV"
    TXT = "TXT"
    PDF = "PDF"
    JSON = "JSON"

class RAG:
    """
    A RAG module.

    Attributes:
    - VECTOR_STORE_DOCUMENTS_RECORD: The file containing the list of files used to populate the vector store
    - VECTOR_STORE_FOLDER:           The folder where the vector store is saved
    - vector_store:                  The vector store
    """

    VECTOR_STORE_DOCUMENTS_RECORD = "vector-store-documents.json"
    VECTOR_STORE_FOLDER = "chroma-vector-store/"

    def __init__(self, embedding_model: str, directory: str):
        raise Exception("Invalid class: __init__() not implemented")

    def search(self, query: str, k: int=3) -> list[str]:
        """
        Search and retrieves context from the vector store based on user query.

        Parameters:
        - query: The user query used for retrieval
        - k:     The number of records to retrieve

        Returns:
        - List of retrieved records from the vector store
        """

        raise Exception("Invalid class: search() not implemented")
    
    def load_files(self, files: list[(str, DocumentExtension)]) -> None:
        """
        Loads files to be used as sources for retrieval. If the saved vector store contained the same files, it is simply loaded from local storage. Otherwise, the vector store is created.

        Parameters:
        - files: List of files to load
        """

        filepaths = [path for (path, _) in files]
        
        if is_list_equal_to_json_file_content(filepaths, f"{self.directory}{self.VECTOR_STORE_DOCUMENTS_RECORD}"):
            self.__load_vector_store()
        else:
            self.__create_vector_store(files)
            self.__save_vector_store(filepaths)        

    def __create_vector_store(self, files: list[(str, DocumentExtension)]) -> None:
        """
        Creates a vector store from files.

        Parameters:
        - files: List of files to use
        """

        documents = []
        for path, extension in files:
            documents.extend(self._get_documents_from_file(path, extension))

        self.vector_store = Chroma.from_documents(
            documents=documents,
            embedding=self.embeddings,
            persist_directory=f"{self.directory}{self.VECTOR_STORE_FOLDER}"
        )
        print(f"Successfully created the Vector Store with {len(documents)} documents")

    def _get_documents_from_file(self, path: str, extension: DocumentExtension) -> list[Document]:
        """
        Splits a file into Documents. The file should be pre-processed to list Documents between ";\n".

        Parameters:
        - path:      The path of the file to split
        - extension: The extension of the file
        """
        
        print(f"Loading file '{path}'...")

        documents = []
        if extension == DocumentExtension.TXT:
            with open(path, "r") as file:
                documents = [Document(page_content=content) for content in file.read().split(";\n")]

        elif extension == DocumentExtension.JSON:
            with open(path, "r", encoding="utf-8") as file:
                data = json.load(file)
                for item in data:
                    if "content" in item and item["content"].strip():
                        doc = Document(
                            page_content=item["content"],
                            metadata={
                                "source": item.get("source", os.path.basename(path)),
                                "article_id": item.get("article_id", "Unknown")
                            }
                        )
                        documents.append(doc)
        else:
            raise Exception("Document extension not supported")
        print(f"File '{path}' loaded ({len(documents)} documents).")
        return documents
 
    def __save_vector_store(self, filepaths: list[str]) -> None:
        """
        Saves the current vector store to local storage.

        Parameters:
        - filepaths: List of paths of the files used to populate the vector store
        """

        with open(f"{self.directory}{self.VECTOR_STORE_DOCUMENTS_RECORD}", "w") as file:
            json.dump(filepaths, file)
        print(f"Saved Vector Store to {self.VECTOR_STORE_FOLDER}")   

    def __load_vector_store(self) -> None:
        """
        Loads a vector store from local storage.
        """

        #FAISS.load... changed to Chroma
        self.vector_store = Chroma(
            persist_directory=f"{self.directory}{self.VECTOR_STORE_FOLDER}",
            embedding_function=self.embeddings,
            #allow_dangerous_deserialization=True # WARNING: Load only self-created files (trusted)
        )
        print(f"Loaded Vector Store from '{self.directory}{self.VECTOR_STORE_FOLDER}' (same files)")   

class CapecRAG(RAG):
    """
    RAG module with re-ranking
    """

    def __init__(self, embedding_model: str, directory: str, complete_capec: (str, DocumentExtension)):
        self.embeddings = OllamaEmbeddings(model=embedding_model)
        self.directory = directory
        self.llm = ChatOllama(model="llama3.1:8b", temperature=0)
        
        complete_capec_file, extension = complete_capec
        if extension != DocumentExtension.JSON:
            raise Exception("Only JSON file are supported")

        self.complete_capec = self.__get_complete_capec(complete_capec_file)
 
    def __get_complete_capec(self, filename):
        capec_dict = {}
            
        with open(filename, "r") as json_file:
            capec_dict = json.load(json_file)

        return capec_dict   

    def search(self, query, k=6):
        """
        Search and retrieves capec context from the vector store based on user query.

        Parameters:
        - query: The user query used for retrieval
        - k:     The number of records to retrieve

        Returns:
        - List of retrieved capec records from the vector store
        """

        results = self.vector_store.similarity_search(query=query, k=k)
        complete_results = ""
        for result in results:
            capec_id = get_capec_id_from_text(result.page_content)
            if capec_id and capec_id in self.complete_capec:
                complete_results += self.complete_capec[capec_id]

        system_prompt = "You are a helpful assistant that determines whether given information items (delimited by '###') relates to a certain context (delimited by <context></context>) or not. You return the top 3 detailed capec entries that relate best to the context. For each capec entry you decide to return, copy all the details including the description, vulnerabilities (if there are any), and mitigations"
        human_prompt = """You will be given a context and information items. Return the top 3 detailed (just copy the description, vulnerabilities and mitigations) capec entries that relate best to the context.
        Context:
        <context>
        {context}
        </context>

        Capec entries: 
        ###
        {items}
        ###"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
        chain = prompt | self.llm
        result = chain.invoke({
            "context": query,
            "items": complete_results
        })

        return [result.content]

class NVDRAG(RAG):    
    """
    RAG module specifically for NVD vulnerability documents (CVEs).
    """

    def __init__(self, embedding_model: str, directory: str):
        self.embeddings = OllamaEmbeddings(model=embedding_model)
        self.directory = directory
        self.llm = ChatOllama(model="llama3.1:8b", temperature=0)

    def _get_documents_from_file(self, path: str, extension: DocumentExtension) -> list[Document]:
        """
        overload the method to special json nvd format
        """
        if extension != DocumentExtension.JSON:
            return super()._get_documents_from_file(path, extension)

        print(f"Loading simplified NVD file '{path}'...")
        documents = []
        
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
            
            for item in data:
                cve_id = item.get("id", "Unknown CVE")
                content = item.get("content", "")
                
                if not content:
                    continue
                
                cwes_list = item.get("cwes", [])
                cwe_str = ", ".join(list(set(cwes_list))) if cwes_list else "Unknown"
                
                metrics = item.get("metrics", {})
                score = metrics.get("score", "Unknown")
                severity = metrics.get("severity", "Unknown")
                
                page_content = f"Vulnerability ID: {cve_id}\nDescription: {content}"
                
                doc = Document(
                    page_content=page_content,
                    metadata={
                        "source": "NVD",
                        "cve_id": cve_id,
                        "score": score,
                        "severity": severity,
                        "cwes": cwe_str
                    }
                )
                documents.append(doc)
                
        print(f"NVD File '{path}' loaded ({len(documents)} vulnerabilities extracted).")
        return documents

    def search(self, query: str, k: int=6) -> list[str]:
        """
        Search and retrieves CVEs context from the vector store based on user query.

        Parameters:
        - query: The user query used for retrieval
        - k:     The number of records to retrieve

        Returns:
        - List of retrieved CVEs records from the vector store
        """
        results = self.vector_store.similarity_search(query=query, k=k)
        
        context_items = ""
        for res in results:
            cve_id = res.metadata.get("cve_id", "Unknown ID")
            cve_cwe = res.metadata.get("cwes",'Unknown CWEs')
            cve_score = res.metadata.get("score", "Unknow score")
            cve_severity = res.metadata.get("severity", "Unknown severity")
            context_items += f"###\nCVE ID: {cve_id}\nCWEs: {cve_cwe} | Score: {cve_score} ({cve_severity})\nContent: {res.page_content}\n"

        system_prompt = """You are a strict cybersecurity expert. You evaluate if the retrieved CVEs (vulnerabilities) apply to the user's system description or technology stack.
        CRITICAL RULES:
        1. You MUST extract the exact CVE ID, Score, Severity, and CWE from the provided vulnerabilities.
        2. DO NOT invent CVEs or CWEs. ONLY use the information provided in the <vulnerabilities> tag.
        """
        human_prompt = """System Context:
        <context>
        {context}
        </context>

        Provided Vulnerabilities:
        <vulnerabilities>
        {items}
        </vulnerabilities>

        Based ONLY on the provided vulnerabilities, return the most relevant CVEs that could impact the system : RETURNS ONLY THOSES CVEs THAT EXACLTY MATCH THE DESCRIPTION PROVIDED IN THE <context> TAG, if it's not match don't returns the CVE. 
        Pay particular attention to the name of the software; if it has no revelant link to the context, don’t keep it.

        You MUST format your response exactly like this for each vulnerability:
        **CVE ID:** [Exact CVE ID]
        **CWE:** [Exact CWEs from the context]
        **Score & Severity:** [Score] ([Severity])
        **Threat Summary:** [Brief summary of the threat]
        **Why it applies:** [Explain clearly why it applies to the system context]
        """
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", human_prompt)
        ])
        
        chain = prompt | self.llm
        result = chain.invoke({
            "context": query,
            "items": context_items
        })
        return [result.content]

class ComplianceRAG(RAG):
    """
    RAG module for Legal and Compliance documents (GDPR, AI Act, NIS2, etc.)
    """

    def __init__(self, embedding_model: str, directory: str):

        self.embeddings = OllamaEmbeddings(model=embedding_model)
        self.directory = directory
        self.llm = ChatOllama(model="llama3.1:8b", temperature=0)

    def search(self, query: str, k: int=20, options: dict=None) -> str:
        """
        Search and retrieves articles context from the vector store based on user query.

        Parameters:
        - query: The user query used for retrieval
        - k:     The number of records to retrieve
        - options : A list of options selected by the user

        Returns:
        - List of retrieved articles records from the vector store
        """

        search_filter = None
        if options :
            active_laws = []
            if options.get("GDPR", False): active_laws.append("GDPR")
            if options.get("NIS2", False): active_laws.append("NIS2")
            if options.get("AI_Act", False): active_laws.append("AI_Act")
            if options.get("Cybersecurity_Act", False): active_laws.append("Cybersecurity_Act")
            if options.get("CyberResilience_Act", False): active_laws.append("CyberResilience_Act")

            if len(active_laws) == 1:
                search_filter = {"source": active_laws[0]}
            elif len(active_laws) > 1:
                search_filter = {"source": {"$in": active_laws}}

        raw_results = self.vector_store.similarity_search(query=query, k=k, filter=search_filter)
        filtered_results = self._filter_laws(query, raw_results, options)
        
        context_items = ""
        for i, res in enumerate(filtered_results, 1):
            source = res.metadata.get("source", "Unknown Law")
            article = res.metadata.get("article_id", "Unknown Article")
            context_items += f"""<article id="{i}">
            <law_name>{source}</law_name>
            <article_number>{article}</article_number>
            <content>{res.page_content}</content>
            </article>\n"""

        if not context_items:
            return "<legal_context>No relevant laws found.</legal_context>"
            
        return context_items

    # def _filter_laws(self, system_description: str, raw_results: list) -> list:
    #     """
    #     A filter to keep only that are really revelant to the system description.
    #     """

    #     if not raw_results:
    #         return []

    #     articles_text = ""
    #     for index, res in enumerate(raw_results):
    #         safe_content = res.page_content.replace("{", "(").replace("}", ")")
    #         articles_text += f"\n--- DOCUMENT {index} ---\n{safe_content}\n"

    #     filter_prompt = ChatPromptTemplate.from_template("""
    #     You are a strict, highly thorough legal auditor analyzing cybersecurity flaws.
        
    #     System Description (Flaws):
    #     {description}
        
    #     Retrieved Legal Documents:
    #     <documents>
    #     {articles}
    #     </documents>
        
    #     TASK:
    #     You must evaluate EVERY SINGLE document provided. 
        
    #     ### STRICT RELEVANCE RULES (ANTI-SHOEHORNING):
    #     - PREVENTATIVE vs REACTIVE: Do NOT flag "Data Breach Notification" or "Incident Reporting" laws if the system merely has a *potential vulnerability*. A risk is not a realized data breach.
    #     - CONTEXTUAL MATCH: Do NOT flag laws about "Criminal Convictions" just because a hacker acts criminally. 
    #     - If the document does not DIRECTLY govern the specific technical or organizational flaw described, REJECT IT.
        
    #     1. Inside <thinking> tags, you MUST write one short sentence for EACH document explaining if it is relevant or not.
    #     2. Inside <result> tags, provide the index numbers of ALL relevant DOCUMENTS as a comma-separated list (e.g., 0, 2, 5, 8). 
        
    #     EXAMPLE OF CORRECT THINKING:
    #     <thinking>
    #     DOCUMENT 0: Covers security of processing. Relevant to the default credentials risk.
    #     DOCUMENT 1: Covers AI transparency. Irrelevant to this SQL injection flaw.
    #     DOCUMENT 2: Covers data breach notification. Relevant because the database was compromised.
    #     DOCUMENT 3: Covers governance. Relevant because management failed to patch vulnerabilities.
    #     </thinking>
    #     <result>0, 2, 3</result>
    #     """)
        
    #     filter_chain = filter_prompt | self.llm | StrOutputParser()
        
    #     llm_response = filter_chain.invoke({
    #         "description": system_description,
    #         "articles": articles_text
    #     })
        
    #     result_tags = re.findall(r'<result>(.*?)</result>', llm_response, re.DOTALL | re.IGNORECASE)
        
    #     if not result_tags:
    #         return []
            
    #     valid_indices = []
        
    #     for tag_content in result_tags:
    #         tag_content = tag_content.strip().upper()
    #         if "NONE" in tag_content:
    #             continue
                
    #         digits = re.findall(r'\d+', tag_content)
    #         valid_indices.extend([int(d) for d in digits])
            
    #     valid_indices = list(set(valid_indices))
                
    #     valid_laws = []
    #     for idx in valid_indices:
    #         if 0 <= idx < len(raw_results):
    #             valid_laws.append(raw_results[idx])
    #     return valid_laws

    def _filter_laws(self, system_description: str, raw_results: list, options: dict = None) -> list:
        """
        A filter to keep only that are really revelant to the system description or targeted assets.
        """

        scope = options.get('scope', {})
        assets = scope.get('assets', [])

        if not raw_results:
            return []

        articles_text = ""
        for index, res in enumerate(raw_results):
            safe_content = res.page_content.replace("{", "(").replace("}", ")")
            articles_text += f"\n--- DOCUMENT {index} ---\n{safe_content}\n"
            
        assets_instruction=""
        if assets :
            assets_instruction = f"""
            Select articles that are really revelant to these assets in case they are exposed following a cyber attack : {assets}.
            """

        filter_prompt = ChatPromptTemplate.from_template("""
        You are a strict, highly thorough legal auditor analyzing a cybersecurity context.
        
        System Context (Description, Flaws, or Assets to protect):
        {description}
        
        Retrieved Legal Documents:
        <documents>
        {articles}
        </documents>
        
        TASK:
        You must evaluate EVERY SINGLE document provided. 

        {assets_instruction}
        
        ### STRICT RELEVANCE RULES (ANTI-SHOEHORNING):
        - ASSET PROTECTION: If the context mentions specific assets (like 'Patient Health Data' or 'Critical Infrastructure'), KEEP laws related to the protection, confidentiality, or processing of that specific type of asset.
        - PREVENTATIVE vs REACTIVE: Do NOT flag "Data Breach Notification" or "Incident Reporting" laws if the context only describes an asset or a potential vulnerability without an actual breach.
        - CONTEXTUAL MATCH: Do NOT flag laws about "Criminal Convictions" just because a hacker acts criminally. 
        - If the document does not DIRECTLY govern the specific context, asset, or technical flaw described, REJECT IT.
        
        1. Inside <thinking> tags, you MUST write one short sentence for EACH document explaining if it is relevant or not.
        2. Inside <result> tags, provide the index numbers of ALL relevant DOCUMENTS as a comma-separated list (e.g., 0, 2, 5, 8). 
        
        EXAMPLE OF CORRECT THINKING:
        <thinking>
        DOCUMENT 0: Covers security of processing. Relevant to protecting the database asset.
        DOCUMENT 1: Covers AI transparency. Irrelevant to this context.
        DOCUMENT 2: Covers data breach notification. Irrelevant because no breach has occurred yet.
        DOCUMENT 3: Covers governance. Relevant because it mandates organizational security for this asset type.
        </thinking>
        <result>0, 3</result>
        """)
        
        filter_chain = filter_prompt | self.llm | StrOutputParser()
        
        llm_response = filter_chain.invoke({
            "description": system_description,
            "articles": articles_text,
            "assets_instruction": assets_instruction
        })
        
        result_tags = re.findall(r'<result>(.*?)</result>', llm_response, re.DOTALL | re.IGNORECASE)
        
        if not result_tags:
            return []
            
        valid_indices = []
        
        for tag_content in result_tags:
            tag_content = tag_content.strip().upper()
            if "NONE" in tag_content:
                continue
                
            digits = re.findall(r'\d+', tag_content)
            valid_indices.extend([int(d) for d in digits])
            
        valid_indices = list(set(valid_indices))
                
        valid_laws = []
        for idx in valid_indices:
            if 0 <= idx < len(raw_results):
                valid_laws.append(raw_results[idx])
        return valid_laws
        
def get_capec_id_from_text(text: str) -> str:
    match = re.search(r'CAPEC-(\d+)', text)
    if match:
        return match.group(1)
    return ""

def is_list_equal_to_json_file_content(data: list, file_path: str) -> bool:
    if not os.path.exists(file_path):
        return False

    with open(file_path, "r") as file:
        file_data = json.load(file)
        if sorted(file_data) == sorted(data):
            return True

    return False

