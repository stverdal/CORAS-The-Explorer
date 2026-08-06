from rag import DocumentExtension

# LLM
from langchain_ollama import OllamaLLM
# Prompt template
from langchain_core.prompts import ChatPromptTemplate

class Summarizer:
    """
    Agent responsible for generating a structured and comprehensive description of the target of analysis from the unstructured user-provided description.

    Attributes:
    - llm: The LLM used for generation
    """

    llm = None
    
    def __init__(self, llm):
        self.llm = llm

    def summarize(self, text: str) -> str:
        """
        Structures the input text.

        Parameters:
        - text: The text to summarize/structure
        
        Returns:    
        - A structured and comprehensive description of the input text
        """

        raise Exception("Invalid class: Summarizer::summarize() not implemented")

class SimpleSummarizer(Summarizer):
    def __init__(self, llm):
        self.llm = llm
        
    def summarize(self, text: str) -> str:
        system_prompt = """
        Translate the text provided in english.
        Do not write any introductory sentence such as 'Here is a description...'. Provide structured, clear and comprehensive description of the system: 
        """

        user_prompt = f"<description>\n{text}\n</description>"

        return self.llm.chat(
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

        return result.content


