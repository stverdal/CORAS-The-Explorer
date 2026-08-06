import json

from summarizer import *
from rag import *
from assessor import *
from formatter import *

class CorasNavigator:
    """
    The CORAS navigator: a facade of the different agents.

    Attributes:
    - summarizer: The summarizer agent
    - capec_rag : The RAG module specified in capec
    - cve_rag: The RAG module specified in cve
    - compliance_rag : The RAG module specified in legal compliance
    - tech_assessor:   The risk assessor agent specified in risk analysis
    - legal_assessor:   The risk assessor agent specified in legal analysis
    - formatter:  The formatter agent
    """

    summarizer: Summarizer
    capec_rag: RAG
    cve_rag : RAG
    compliance_rag : RAG
    tech_assesor = TechnicalAssesor
    legal_assessor = LegalAssessor
    formatter: Formatter

    def __init__(self, summarizer: Summarizer, capec_rag: RAG, cve_rag: RAG, compliance_rag: RAG, tech_assesor : TechnicalAssesor, legal_assessor: LegalAssessor, formatter: Formatter):
        self.summarizer = summarizer
        self.capec_rag = capec_rag
        self.cve_rag = cve_rag
        self.compliance_rag = compliance_rag
        self.tech_assesor = tech_assesor
        self.legal_assessor = legal_assessor
        self.formatter = formatter
    
    def summarize(self, description: str) -> dict:
        """
        Generate a summary of the provided system description

        Parameters:
        - description: A description of the target of analysis

        Returns:
        - A system description summary
        """

        return self.summarizer.summarize(description)

    def generate_full_analysis(self, text: str, options: dict, tech_context: str = "", legal_context: str = "", existing_tech_report: str = "", existing_legal_report: str = "") -> dict:
        """
        Generate the complete analysis : technical + legal depending on the choice of the user
        """
        is_legal_coras = options.get('legal_coras', False)
        is_legal_first = options.get("legal_first", False)
      
        if is_legal_coras and is_legal_first:
            legal_report = self.generate_legal_report(text, legal_context=legal_context, options=options)
            tech_report = self.generate_tech_report(text, previous_context=legal_report, options=options)
            final_analysis = f"## --- COMPLIANCE AUDIT ---\n{legal_report}\n\n\n## --- TECHNICAL AUDIT ---\n{tech_report}"
        
        elif is_legal_coras and not is_legal_first:
            tech_report = existing_tech_report if existing_tech_report else self.generate_tech_report(text, options=options) 
            readable_report = self.tech_assesor.generate_human_readable_report(text, tech_report)
            legal_report = self.generate_legal_report(text, previous_report=readable_report, options=options)
            final_analysis = f"## --- TECHNICAL AUDIT ---\n{tech_report}\n\n\n## --- COMPLIANCE AUDIT ---\n{legal_report}"
        
        else:
            tech_report = self.generate_tech_report(text, options=options)
            legal_report = ""
            final_analysis = f"## --- TECHNICAL AUDIT ---\n{tech_report}"
        return {
            "technical_report": self.tech_assesor.generate_human_readable_report(text, tech_report),
            "legal_report": legal_report,
            "final_analysis_for_coras": final_analysis  
        }
    
    def generate_tech_report(self, text: str, previous_context: str = None, options: dict = None) -> str:
        """
        Generate the all technical analysis depending on previous context and user selection.

        Parameters:
        - text: A system description summarise of the target of analysis
        - previous_context : A previous report to proceed to analysis with legal context
        - options : A list of options of the user personalisation for risk analysis

        Returns:
        - The all technical analysis
        """        
        if options is None:
            options = {}
            
        scope = options.get('scope', {})
        assets = scope.get('assets', [])
        threats = scope.get('threats_source', [])
        is_legal_first = options.get('legal_first', False)

        if is_legal_first and previous_context:
            print("--- PHASE COMPLIANCE-DRIVEN: Reverse Technical Exploration (Bottom-Up) ---")
            return self.tech_assesor.explore_reverse_from_legal(
                description=text,
                legal_report=previous_context,
                assets=assets,
                threats=threats,
                options=options
            )

        print("--- GENERATING GLOBAL TECH CONTEXT (For Lateral Movement & Deep Flaws) ---")
        tech_keywords = self.tech_assesor.describe_for_tech_from_scope(text, scope)
        global_capec = self.capec_rag.search(query=tech_keywords, k=10)
        global_cve = self.cve_rag.search(query=tech_keywords, k=10)
        global_tech_context = "\n".join(global_capec + global_cve)

        if threats and not assets:
            print("--- MODE ATTACKER-CENTRIC: Top-Down Exploration ---")
            isolated_paths = []
            for threat in threats:
                search_query = f"Initial access vectors for threat actor '{threat.get('title')}' targeting system with: {tech_keywords}"
                raw_capec = self.capec_rag.search(query=search_query, k=2)

                combined_context = f"--- INITIAL ACCESS VULNERABILITIES ---\n{chr(10).join(raw_capec)}\n\n--- INTERNAL SYSTEM VULNERABILITIES (LATERAL MOVEMENT) ---\n{global_tech_context}"
                
                path = self.tech_assesor.explore_top_down(
                    description=text, 
                    threat=threat, 
                    tech_context=combined_context,
                    options=options
                )
                isolated_paths.append(f"### Attack Path for {threat.get('title')}\n{path}")
            
            all_isolated_paths = "\n\n".join(isolated_paths)
            return self.tech_assesor.converge_top_down(
                description=text,
                all_isolated_paths=all_isolated_paths,
                threats=threats,
                options=options
            )

        elif assets and not threats:
            print("--- MODE ASSET-CENTRIC: Bottom-Up Exploration (Bottom-Up) ---")
            isolated_paths = []
            for asset in assets:
                search_query = f"Vulnerabilities and threat scenarios to compromise asset '{asset.get('title')}' in a system containing: {tech_keywords}"
                raw_capec = self.capec_rag.search(query=search_query, k=2)

                combined_context = f"--- ASSET-SPECIFIC VULNERABILITIES ---\n{chr(10).join(raw_capec)}\n\n--- INTERNAL SYSTEM VULNERABILITIES (LATERAL MOVEMENT) ---\n{global_tech_context}"
                
                path = self.tech_assesor.explore_bottom_up(
                    description=text,
                    asset=asset,
                    tech_context=combined_context,
                    options=options
                )
                isolated_paths.append(f"### Reverse Path for Asset {asset.get('title')}\n{path}")
                
            all_isolated_paths = "\n\n".join(isolated_paths)
            return self.tech_assesor.converge_bottom_up(
                description=text,
                all_isolated_paths=all_isolated_paths,
                assets=assets,
                options=options
            )

        elif assets and threats:
            print("--- MODE CONVERGENCE: Meet-in-the-Middle ---")
            isolated_paths = []
            for threat in threats:
                print(f"\nFinding initial vulnerabilities for : {threat.get('title')}")
                search_query = f"Initial attack vectors for '{threat.get('title')}' against technical components: {tech_keywords}"                
                raw_capec = self.capec_rag.search(query=search_query, k=3)
                raw_cve = self.cve_rag.search(query=search_query, k = 3)
                tech_context = raw_capec + raw_cve
                
                combined_context = f"--- THREAT INITIAL ACCESS ---\n{chr(10).join(tech_context)}\n\n--- INTERNAL SYSTEM VULNERABILITIES (LATERAL MOVEMENT) ---\n{global_tech_context}"

                path = self.tech_assesor.explore_isolated_kill_chain(
                    description=text, 
                    threat=threat, 
                    tech_context=combined_context,
                    options=options
                )
                isolated_paths.append(f"### Attack Path for {threat.get('title')}\n{path}")

            all_isolated_paths = "\n\n".join(isolated_paths)
            return self.tech_assesor.converge_and_target(
                description=text,
                all_isolated_paths=all_isolated_paths,
                assets=assets,
                options=options
            )
        
        else:
            return "Error: Neither Assets nor Threats specified in the scope selection."
    
    def generate_legal_report(self, text: str, previous_report: str = None, legal_context: str = None, options: dict = None) -> str:
        """
        Generate the all legal analysis depending on previous context and user selection.

        Parameters:
        - text: A description of the target of analysis
        - previous_report : A previous report to proceed to analysis with technical context to link articles and risks
        - legal_context : The RAG result : a list a potential revelant compliance articles
        - options : A list of options of the user personalisation for legal analysis

        Returns:
        - The all legal analysis
        """

        if options is None:
            options = {}

        if not legal_context:
            print("Generating the legal context...")
            scope = options.get('scope', {})
            assets = scope.get('assets', [])
            
            if options.get('legal_first') and assets:
                assets_summary = ", ".join([a.get('title', '') for a in assets])
                enriched_description = f"System Description:\n{text}\n\nCritical Assets to protect:\n{assets_summary}"
                search_query = self.legal_assessor.describe_for_legal(enriched_description)                
            else:
                if previous_report:
                    search_query = self.tech_assesor.describe_for_legal(text, previous_report)
                else:
                    search_query = self.legal_assessor.describe_for_legal(text)                
            legal_context = self.compliance_rag.search(search_query, options=options)

        print("Generating the legal report...")
        return self.legal_assessor.assess(
            description=text, 
            legal_context=legal_context, 
            technical_report=previous_report, 
            options=options
        )
    
    def format(self, text: str, options : dict = None) -> str:
        return self.formatter.format(text, options)

    def extract_json(self, text: str) -> str:
        try:
            json = extract_JSON(text)
            return json
        except ValueError as error:
            # No JSON found
            return ""
        except Exception as exception:
            # Invalid JSON
            return ""

def extract_JSON(text: str):
    try:
        start = text.index('{')
        end = text.rindex('}')
    except ValueError as error:
        raise ValueError("No JSON object found") from error
       
    try:
        json_object = json.loads(text[start:end+1])
    except ValueError as error:
        raise Exception("Invalid JSON") from error

    return json_object
