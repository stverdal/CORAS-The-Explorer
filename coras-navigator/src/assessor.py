import json


class TechnicalAssesor():
    """
    Agent responsible of generating textual risks slection and analysis.
    """

    def __init__(self, llm):
        self.llm = llm

    def describe_for_legal(self, text: str, tech_report: str) -> str :
        """
        Generate a list of keywords from technical report to a legal RAG.

        Parameters:
        - text: A description of the target of analysis
        - tech_report : The generated technical analysis

        Returns:
        - A list of legal keywords
        """

        system_prompt="""
        <role>
        You are an expert IT Legal & Compliance Translator.
        Your task is to translate a Technical Cybersecurity Report into highly targeted REGULATORY and LEGAL search queries.
        </role>

        <critical_rules>
        1. BE SURGICAL AND CONCISE: Extract a MAXIMUM of 10 highly distinct legal/compliance concepts.
        2. NO REPETITION: Do NOT generate variations of the same phrase. If you mention "Data Protection Impact Assessment" once, do not mention it again.
        3. RAG OPTIMIZATION: Instead of single disconnected words, write short, descriptive semantic phrases (e.g., "Failure to implement encryption at rest leading to unauthorized access of sensitive health data"). Embedding models understand descriptive intent better than keyword lists.
        4. Do NOT list the names of the laws themselves (e.g., do not write "GDPR" or "NIS2").

        The Technical Cybersecurity Report to translate is in the <context> tag and you have also the <description> tag to help you to be revelant to the system.
        </critical_rules>

        Output ONLY your short list of distinct legal concepts, one per line. No introduction.
        """

        user_prompt = f"System Description : <decription>{text}</description>\n\n<context>\n{tech_report}\n</context>"
        
        return self.llm.chat(
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

    def extract_scope(self, description: str, options: dict = None) -> dict:
        """
        Extracts the initial Threat Sources and Target Assets from the system description to populate the scope selection UI (Double Column).

        Parameters : 
        - text : A description of the system
        - options : A list of options of the user personalisation

        Returns : 
        - A list in two part with threats source ans assets
        """

        supply_chain_prompt = ""
        if (options.get("supply_chain",{})):
            supply_chain_prompt = """
            <supply_chain_focus>
            CRITICAL: This is a SUPPLY CHAIN analysis. 
            For Assets: Explicitly look for third-party integrations, external APIs, cloud providers, and vendor-managed hardware.
            For Threat Sources: You MUST include actors like "Compromised Software Vendor", "Malicious Hardware Manufacturer", "Third-party Cloud Admin", or "Poisoned Open-Source Dependency".
            </supply_chain_focus>
            """
        
        system_prompt = f"""
        <role>
        You are a Senior Cyber-Physical Risk Analyst. Your task is to extract the Scope (Critical Assets and Threat Sources) from the provided system description.
        </role>

        {supply_chain_prompt}

        <instructions>
        1. ASSETS (Crown Jewels): What does the organization care about? (e.g., Patient Health Data, Server Availability, ...). Extract 3 to 6 distinct high-value assets. Prefix their IDs with 'A' (e.g., A1, A2). Don't list Regulatory Compliance choice.
        2. THREAT SOURCES (CRITICAL - ANTI-GENERIC RULE): DO NOT output generic IT threats like "Remote Hacker", "Rogue Employee", or "Insider Threat". You MUST contextualize the threat actors to the specific domain of the description.
           - If it's a medical IoT system, identify actors like "Malicious Caregiver", "Untrained Physician", "Proximity Attacker (Bluetooth range)", or "Compromised Supply Chain Vendor".
           - Include accidents and human errors (e.g., "Patient misconfiguring the device").
           - Include physical and non-human threats (e.g., "Sensor Hardware Degradation", "Docking Station Power Failure").
        3. THREAT TYPES: You must categorize threats strictly into one of these 3 CORAS types:
           - "human_threat_malicious" (Deliberate attacks)
           - "human_threat_non_malicious" (Accidents, lack of training, errors)
           - "non_human_threat" (Hardware failure, software bugs, environmental events)
        </instructions>

        ### OUTPUT FORMAT (CRITICAL)
        You MUST output ONLY a valid JSON object containing the data directly. 
        DO NOT output a JSON Schema. DO NOT include "type", "properties", or "items" keys at the root level.
        No markdown fences, no explanatory text.

        Your output MUST match exactly this structure:
        {{
          "threats_source": [
            {{
              "id": "T1",
              "title": "Compromised Supply Chain Vendor",
              "type": "human_threat_malicious",
              "description": "Short description of the threat actor and their capability."
            }}
          ],
          "assets": [
            {{
              "id": "A1",
              "title": "Customer PII Database",
              "description": "Short description of the asset and why it is critical."
            }}
          ]
        }}
        """

        user_prompt = f"System Description:\n<description>\n{description}\n</description>\n\nExtract the Assets and Threat Sources into the requested JSON format."

        try:
            print("Extracting business scope (Assets & Threats) via Universal LLM Adapter...")
            response_text = self.llm.chat(
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                json_mode=True 
            )
            
            clean_json = response_text.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            elif clean_json.startswith("```"):
                clean_json = clean_json[3:]
                
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
                
            clean_json = clean_json.strip()
            
            parsed_data = json.loads(clean_json)
            
            if "threats_source" not in parsed_data:
                parsed_data["threats_source"] = []
            if "assets" not in parsed_data:
                parsed_data["assets"] = []
                
            return parsed_data
            
        except Exception as e:
            print(f"Error extracting scope: {e}")
            print(f"Raw output was:\n{response_text if 'response_text' in locals() else 'None'}")
            return {"threats_source": [], "assets": []}
   
    def describe_for_tech_from_scope(self, description: str, scope: dict = None) -> str :
        """
        Generate a list of keywords from description summary report and selected scope to a technical RAG.

        Parameters:
        - description: A description of the target of analysis
        - scope : A list a threats source and assets selected by the user.

        Returns:
        - A list of technical keywords
        """

        system_prompt="""
        You are a technical architect. Extract ONLY the pure hardware, software, and networking specifications from the following system description, Threats Source, and Assets. 
        Ignore all business context, medical conditions, and user experience details.
        
        Extract terms related to:
        - Microcontrollers & Memory (e.g., Flash, RAM, MHz)
        - Communication protocols (e.g., Bluetooth, BLE, Wi-Fi)
        - Architecture (e.g., Gateway, Wearable, Debug interface)
        
        Return ONLY a comma-separated list of technical keywords and components. Do not write full sentences.
        """
        threats_source = json.dumps(scope.get("threats_source", []))
        assets = json.dumps(scope.get("assets", []))
        user_prompt = f"System description : <description>\n{description}\n</description>\n\n Selected Threats Source : \n<selected_threats_source>\n{threats_source}\n</selected_threats_source>\n\nSelected Assets : \n<selected_assets>\n{assets}\n</selected_assets>"

        return self.llm.chat(
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )
    
    def explore_reverse_from_legal(self, description: str, legal_report: str, assets: list, threats: list, options: dict = None) -> str:
        """
        LEGAL PRIORITY : Technical reverse engineering (bottom-up) based on the laws that have been breached and the compromised assets.

        Parameters : 
        - description : A description of the system
        - legal_report : The generated legal report
        - assets : The list of selected assets
        - threats : The list of selected threats
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The Technical analysis depending on a legal report
        """

        assets_text = "\n".join([f"- {a.get('id', 'ID?')}: {a.get('title', 'Unknown')}" for a in assets])
        threats_text = "\n".join([f"- {t.get('id', 'ID?')}: {t.get('title', 'Unknown')}" for t in threats]) if threats else "None explicitly selected. Deduce them."

        supply_chain_directive = ""
        if options and options.get("supply_chain"):
            supply_chain_directive = """
            <supply_chain_focus>
            CRITICAL: Force the attack path to exploit SUPPLY CHAIN weaknesses. 
            Prioritize vulnerabilities involving compromised CI/CD pipelines, malicious third-party updates, default vendor credentials, or vulnerable open-source libraries.
            </supply_chain_focus>
            """

        system_prompt = f"""
        <role>
        You are a Digital Forensics and Incident Response (DFIR) Expert. 
        Your task is to REVERSE-ENGINEER a highly complex cyber attack graph. You know the final outcome, and you must deduce the technical paths backwards.
        </role>

        {supply_chain_directive}

        <instructions>
        1. Read the <legal_report> and <target_assets>.
        2. WORK BACKWARDS: Asset -> Unwanted Incident -> Threat Scenario(s) -> Threat Source.
        3. ANTI-BOTTLENECK: You MUST generate at least ONE distinct Unwanted Incident per asset. Do not merge them into a single incident.
        4. MESH INTERCONNECTION: Force paths to branch. Show scenarios where one vulnerability led to multiple incidents, or multiple attackers exploited the same vulnerability.
        5. VULNERABILITIES ARE MANDATORY: You MUST extract relevant CWE, CAPEC, or CVE data for EVERY technical transition.
        
        ### OUTPUT FORMAT (CRITICAL - PSEUDO-GRAPH ONLY)
        Do NOT write paragraphs. Output a logical graph mapping using EXACTLY this syntax:
        * [Threat Source: Deduced or from list] ---> (Vuln: CWE-XXX / CAPEC-YYY) ---> [Threat Scenario: Technical Action] ---> (Vuln: CWE-ZZZ) ---> [Unwanted Incident: Business Impact, [Law: Article breached]] ---> [Asset: Name]
        </instructions>
        """

        user_prompt = f"System description : \n{description}\n\nTarget Assets:\n{assets_text}\n\nThreat Sources:\n{threats_text}\n\nLegal Report (The final outcome):\n{legal_report}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])

    def explore_top_down(self, description: str, threat: dict, tech_context: str, options: dict = None) -> str:
        """
        MODE ATTACKER-CENTRIC : Explore the attack path starting from the threat, without worrying about the end assets.

        Parameters : 
        - description : A description of the system
        - threats : The list of selected threats
        - tech_context : A list of revelant vulnerabilities for the system
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The list of attacks path depending on the selected threats source and without selected assets
        """

        threat_title = threat.get("title", "Unknown Threat")
        threat_type = threat.get("type", "Unknown Type")

        supply_chain_directive = ""
        if options and options.get("supply_chain"):
            supply_chain_directive = """
            <supply_chain_focus>
            CRITICAL: Force the attack path to exploit SUPPLY CHAIN weaknesses. 
            Prioritize vulnerabilities involving compromised CI/CD pipelines, malicious third-party updates, default vendor credentials, or vulnerable open-source libraries.
            </supply_chain_focus>
            """
        
        system_prompt = f"""
        <role>
        You are an Offensive Security Expert (Red Teamer). Map a pure technical kill-chain for ONE specific threat actor based on the provided technical context.
        </role>

        {supply_chain_directive}

        <instructions>
        1. Focus ONLY on this specific threat actor: {threat_title} ({threat_type}).
        2. Create a deep, multi-step kill-chain.
        3. VULNERABILITIES ARE MANDATORY: Use the <technical_context> to inject EXACT CWE, CAPEC, or CVE identifiers between EVERY step. 
           - Pick the entry point from the "INITIAL ACCESS VULNERABILITIES" section.
           - Pick the subsequent pivot/lateral movement flaws from the "INTERNAL SYSTEM VULNERABILITIES" section.
        4. DESCRIPTIVE NAMES (CRITICAL): Do NOT use generic labels like "Initial Access" or "Lateral Movement". You MUST name the Threat Scenarios based on the actual technical action (e.g., "Malicious Firmware Upload", "Bluetooth Flooding", "SQL Injection").
        5. Do not include Business Assets yet. Stop at the final technical incident.
        6. LOGICAL VULNERABILITY GROUPING (CRITICAL RULE): You can group a CVE with its underlying CWEs on a single edge if they represent the exact same exploit action (e.g., `(Vuln: CVE-2022-39871, CWE-284, CWE-668)` is perfectly valid). However, you are STRICTLY FORBIDDEN from putting MULTIPLE CVEs or MULTIPLE CAPECs on the same edge. If an attack involves exploiting multiple CVEs or distinct CAPECs consecutively, you MUST separate them by inserting a new descriptive `Threat Scenario` between them.
        7. CONCISENESS & SELECTIVITY (CRITICAL): Do NOT try to use every vulnerability provided in the <technical_context>. Select ONLY the 3 to 4 most relevant CWEs/CVEs/CAPECs to build a realistic, direct kill-chain. A single attack path MUST NOT exceed 4 `Threat Scenario` steps.
        
        ### OUTPUT FORMAT (CRITICAL - PSEUDO-GRAPH ONLY)
        Do NOT write prose. Output the attack path using EXACTLY this syntax:
        * [Threat Source: {threat_title}] ---> (Vuln: CAPEC-XXX) ---> [Threat Scenario: Descriptive Action 1] ---> (Vuln: CWE-YYY) ---> [Threat Scenario: Descriptive Action 2] ---> (Vuln: CWE-ZZZ) ---> [Unwanted Incident: Descriptive Final Action]
        </instructions>
        """
        user_prompt = f"System description:\n{description}\n\nTechnical Context:\n{tech_context}\n\nThreat Title:\n{threat_title}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])
    
    def converge_top_down(self, description: str, all_isolated_paths: str, threats: list, options: dict = None) -> str:
        """
        MODE ATTACKER-CENTRIC : Converges the attack paths and forces the LLM to deduce the affected assets.

        Parameters : 
        - description : A description of the system
        - all_isolated_paths : A list of a previous generated attack path
        - threats : The list of selected threats
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The Technical analysis depending on the previous attacks path report
        """
        threats_text = "\n".join([f"- {t['id']}: {t['title']} ({t['type']})" for t in threats])
        
        system_prompt = f"""
        <role>
        You are a Threat Modeler. Your task is to weave isolated attack paths into a highly complex DAG, and DEDUCE the final target assets.
        </role>

        <instructions>
        1. DEDUCE ASSETS: Logically deduce 2 to 4 completely distinct Business/System Assets. Prefix IDs with 'A'.
        2. MANDATORY CORAS FLOW: Every path MUST follow: Threat Source -> Threat Scenario (one or more) -> Unwanted Incident -> Asset.
        3. DISTINCT INITIAL SCENARIOS (CRITICAL): The node immediately following a Threat Source MUST NOT be shared. Each Threat Source MUST have a uniquely named Initial Threat Scenario before any convergence happens.        4. MESH TOPOLOGY: They should only converge (Fan-In) on DEEPER intermediate Threat Scenarios (e.g., a shared Database Pivot or Privilege Escalation) before branching out again (Fan-Out).
        5. DESCRIPTIVE NAMES: Never use generic terms like "Initial Access". Use exact technical actions.
        6. VULNERABILITIES ARE MANDATORY: Retain or add specific CWE/CAPEC identifiers on every edge.
        7. LOGICAL VULNERABILITY GROUPING (CRITICAL RULE): You can group a CVE with its underlying CWEs on a single edge if they represent the exact same exploit action (e.g., `(Vuln: CVE-2022-39871, CWE-284, CWE-668)` is perfectly valid). However, you are STRICTLY FORBIDDEN from putting MULTIPLE CVEs or MULTIPLE CAPECs on the same edge. If an attack involves exploiting multiple CVEs or distinct CAPECs consecutively, you MUST separate them by inserting a new descriptive `Threat Scenario` between them.
        8. CONCISENESS & PATH LIMIT (CRITICAL): The final graph must be readable and realistic. Do NOT blindly keep every single step from the isolated paths. Compress and simplify them. A single path from a Threat Source to an Unwanted Incident MUST NOT exceed 4 intermediate `Threat Scenario` steps. Drop unnecessary vulnerabilities to keep the graph concise.
        </instructions>

        ### OUTPUT FORMAT (CRITICAL - FEW-SHOT EXAMPLE)
        You MUST output ONLY the interconnected paths using the EXACT syntax below. 
        NO INTRODUCTIONS. NO EXPLANATIONS. NO LIST OF NODES. 

        EXAMPLE OUTPUT:
        * [Threat Source: T1 - Ransomware Group] ---> (Vuln: CAPEC-17) ---> [Threat Scenario: Spear Phishing Email] ---> (Vuln: CWE-285) ---> [Threat Scenario: Shared Active Directory Pivot] ---> (Vuln: CWE-400) ---> [Unwanted Incident: Ransomware Encryption] ---> [Asset: A1 - Deduced Database]
        * [Threat Source: T2 - Insider Threat] ---> (Vuln: CAPEC-441) ---> [Threat Scenario: Malicious USB Drop] ---> (Vuln: CWE-285) ---> [Threat Scenario: Shared Active Directory Pivot] ---> (Vuln: CWE-732) ---> [Unwanted Incident: Data Exfiltration] ---> [Asset: A2 - Deduced IP]
        """
        user_prompt = f"System description:\n{description}\n\nThreat Sources:\n{threats_text}\n\nIsolated Attack Paths to merge:\n{all_isolated_paths}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])

    def explore_bottom_up(self, description: str, asset: dict, tech_context: str, options: dict = None) -> str:
        """
        MODE ASSET-CENTRIC : Explore how an asset can be compromised, regardless of who the attacker is.

        Parameters : 
        - description : A description of the system
        - assets : The list of selected assets
        - tech_context : A list of revelant vulnerabilities for the system
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The list of attacks path depending on the selected assets and without selected threats source
        """
        asset_title = asset.get("title", "Unknown Asset")

        supply_chain_directive = ""
        if options and options.get("supply_chain"):
            supply_chain_directive = """
            <supply_chain_focus>
            CRITICAL: Force the attack path to exploit SUPPLY CHAIN weaknesses. 
            Prioritize vulnerabilities involving compromised CI/CD pipelines, malicious third-party updates, default vendor credentials, or vulnerable open-source libraries.
            </supply_chain_focus>
            """
        
        system_prompt = f"""
        <role>
        You are a System Defender & Vulnerability Researcher. Map the structural vulnerabilities that lead to the compromise of a specific asset.
        </role>

        {supply_chain_directive}

        <instructions>
        1. Focus ONLY on this specific asset: {asset_title}.
        2. Map the path BACKWARDS: Asset <- Unwanted Incident <- Threat Scenario <- External Vector.
        3. VULNERABILITIES ARE MANDATORY: Use the <technical_context> to inject EXACT CWE, CAPEC, or CVE identifiers. 
           - Pick the flaw closest to the asset from the "ASSET-SPECIFIC VULNERABILITIES" section.
           - Pick the upstream external/pivot paths from the "INTERNAL SYSTEM VULNERABILITIES" section.        
        4. Do NOT define specific Threat Actors yet. Start the chain at a generic "External/Internal Entry Point".
        5. LOGICAL VULNERABILITY GROUPING (CRITICAL RULE): You can group a CVE with its underlying CWEs on a single edge if they represent the exact same exploit action (e.g., `(Vuln: CVE-2022-39871, CWE-284, CWE-668)` is perfectly valid). However, you are STRICTLY FORBIDDEN from putting MULTIPLE CVEs or MULTIPLE CAPECs on the same edge. If an attack involves exploiting multiple CVEs or distinct CAPECs consecutively, you MUST separate them by inserting a new descriptive `Threat Scenario` between them.
        6. CONCISENESS & SELECTIVITY (CRITICAL): Do NOT try to use every vulnerability provided in the <technical_context>. Select ONLY the 3 to 4 most relevant CWEs/CVEs/CAPECs to build a realistic, direct kill-chain. A single attack path MUST NOT exceed 4 `Threat Scenario` steps.


        ### OUTPUT FORMAT (CRITICAL - REVERSE PSEUDO-GRAPH ONLY)
        Do NOT write prose. Output the structural path using EXACTLY this syntax:
        * [Generic Entry Point] ---> (Vuln) ---> [Threat Scenario: Deep Pivot] ---> (Vuln) ---> [Unwanted Incident: Final Action] ---> [Asset: {asset_title}]
        </instructions>
        """
        user_prompt = f"System description:\n{description}\n\nTechnical Context:\n<technical_context>{tech_context}</technical_context>\n\nTarget Asset:\n{asset_title}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])
 
    def converge_bottom_up(self, description: str, all_isolated_paths: str, assets: list, options: dict = None) -> str:
        """MODE ASSET-CENTRIC : Converges the attack paths and forces the LLM to deduce the affected threats source.

        Parameters : 
        - description : A description of the system
        - all_isolated_paths : A list of a previous generated attack path
        - assets : The list of selected assets
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The Technical analysis depending on the previous attacks path report
        """

        assets_text = "\n".join([f"- {a.get('id', 'ID?')}: {a.get('title', 'Unknown')}" for a in assets])
        
        system_prompt = f"""
        <role>
        You are a Threat Modeler. Your task is to weave isolated asset vulnerabilities into a complex DAG, and DEDUCE the diverse attackers (Threat Sources) who exploit them.
        </role>

        <instructions>
        1. DEDUCE THREAT SOURCES: Logically deduce 2 to 4 DISTINCT Threat Actors. Prefix IDs with 'T'.
        2. MANDATORY CORAS FLOW: Every path MUST follow: Threat Source -> Threat Scenario (one or more) -> Unwanted Incident -> Asset.
        3. MESH TOPOLOGY (CRITICAL): You MUST force different attack paths to intersect. Show how different deduced attackers exploit different initial vulnerabilities to converge (Fan-In) on a SHARED intermediate Threat Scenario before reaching the asset(s).
        4. VULNERABILITIES ARE MANDATORY: Ensure CWE/CAPEC are mapped on every transition.
        5. LOGICAL VULNERABILITY GROUPING: You can group a CVE with its underlying CWEs on a single edge...
        6. CONCISENESS & SELECTIVITY: Select ONLY the 3 to 4 most relevant...
        </instructions>

        ### OUTPUT FORMAT (CRITICAL - FEW-SHOT EXAMPLE)
        You MUST output ONLY the interconnected paths using the EXACT syntax below. 
        NO INTRODUCTIONS. NO EXPLANATIONS. NO LIST OF NODES. 

        EXAMPLE OUTPUT:
        * [Threat Source: T1 - Compromised CloudServe Inc.] ---> (Vuln: CAPEC-112) ---> [Threat Scenario: Brute Force] ---> (Vuln: CWE-285) ---> [Threat Scenario: Shared Internal Network Pivot] ---> (Vuln: CWE-319) ---> [Unwanted Incident: Data Breach] ---> [Asset: A1 - Patient Data]
        * [Threat Source: T2 - Malicious Insider] ---> (Vuln: CAPEC-533) ---> [Threat Scenario: Bypass Physical Locks] ---> (Vuln: CWE-285) ---> [Threat Scenario: Shared Internal Network Pivot] ---> (Vuln: CWE-404) ---> [Unwanted Incident: System Crash] ---> [Asset: A2 - Control Server]
        """
        user_prompt = f"System description:\n{description}\n\nTarget Assets:\n{assets_text}\n\nIsolated Reverse Paths to merge:\n{all_isolated_paths}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])
       
    def explore_isolated_kill_chain(self, description: str, threat: dict, tech_context: str, options: dict = None) -> str:
        """Classic Convergence : Explore from top down with selected threats source

        Parameters : 
        - description : A description of the system
        - threats : The list of selected threats
        - tech_context : A list of revelant vulnerabilities for the system
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The list of attacks path depending on the selected threats source and without selected assets
        """ 
        
        threat_title = threat.get("title", "Unknown Threat")
        threat_type = threat.get("type", "Unknown Type")

        supply_chain_directive = ""
        if options and options.get("supply_chain"):
            supply_chain_directive = """
            <supply_chain_focus>
            CRITICAL: Force the attack path to exploit SUPPLY CHAIN weaknesses. 
            Prioritize vulnerabilities involving compromised CI/CD pipelines, malicious third-party updates, default vendor credentials, or vulnerable open-source libraries.
            </supply_chain_focus>
            """
        
        system_prompt = f"""
        <role>
        You are an Offensive Security Expert (Red Teamer). Narrate a realistic kill-chain for ONE specific threat actor.
        </role>

        {supply_chain_directive}

        <instructions>
        1. Focus ONLY on this specific threat actor: {threat_title} ({threat_type}).
        2. Describe their attack path step-by-step.
        3. Rely EXCLUSIVELY on general Weaknesses (CWE) and Attack Patterns (CAPEC) from the context.
        4. VULNERABILITY SOURCING (CRITICAL): You MUST rely EXCLUSIVELY on general Weaknesses (CWE) and Attack Patterns (CAPEC) from the <technical_context>.
           - Use the "THREAT INITIAL ACCESS" section for the entry points.
           - Use the "INTERNAL SYSTEM VULNERABILITIES" section for lateral movement and deep architecture exploitation.
        5. LOGICAL VULNERABILITY GROUPING (CRITICAL RULE): Do not group a CVE with its underlying CWEs on a single edge if they represent the exact same exploit action (e.g., `(Vuln: CVE-2022-39871, CWE-284, CWE-668)` must just be CVE-2022-39871). 
        6. You are STRICTLY FORBIDDEN from putting MULTIPLE CVEs or MULTIPLE CAPECs on the same edge. If an attack involves exploiting multiple CVEs or distinct CAPECs consecutively, you MUST separate them by inserting a new descriptive `threat_scenario` between them !

        </instructions>
        """
        user_prompt = f"System description:\n{description}\n\nTechnical Context:\n<technical_context>{tech_context}</technical_context>\n\nThreat Type:\n{threat_type}\n\nThreat Title:\n{threat_title}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])

    def converge_and_target(self, description: str, all_isolated_paths: str, assets: list, options: dict = None) -> str:
        """Convergence Classique : Meet in the Middle from the top-down analysis and the selected assets

        Parameters : 
        - description : A description of the system
        - all_isolated_paths : A list of a previous generated attack path
        - assets : The list of selected assets
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - The Technical analysis depending on both of the scope
        """
        
        assets_text = "\n".join([f"- {a.get('id', 'ID?')}: {a.get('title', 'Unknown')}" for a in assets])        
        scope = options.get('scope', {})
        threats = scope.get('threats_source', [])
        threats_text = "\n".join([f"- {t['id']}: {t['title']} ({t['type']})" for t in threats])
        
        system_prompt = f"""
        <role>
        You are a Senior Threat Modeler. Weave isolated attack paths into a highly interconnected Directed Acyclic Graph (DAG) with a complex MESH topology.
        </role>

        <instructions>
        1. MANDATORY CORAS FLOW: Every single path MUST follow this exact sequence:
           Threat Source -> Threat Scenario (one or more) -> Unwanted Incident -> Asset.
           NEVER link a Threat Source directly to an Asset or an Unwanted Incident.
        2. STRICT ANTI-BOTTLENECK RULE: Do not route all attacks through a single generic "Unwanted Incident". Generate at least as many distinct Unwanted Incidents as there are Target Assets.
        3. MESH TOPOLOGY: Each Threat Source MUST have at least ONE unique Initial Threat Scenario before they are allowed to converge (Fan-In) on a shared deeper Threat Scenario.
        4. VULNERABILITY SOURCING: You MUST inject exact CWE/CAPEC identifiers on every arrow.
        5. LOGICAL VULNERABILITY GROUPING (CRITICAL RULE): You can group a CVE with its underlying CWEs on a single edge if they represent the exact same exploit action (e.g., `(Vuln: CVE-2022-39871, CWE-284, CWE-668)` is perfectly valid). However, you are STRICTLY FORBIDDEN from putting MULTIPLE CVEs or MULTIPLE CAPECs on the same edge. If an attack involves exploiting multiple CVEs or distinct CAPECs consecutively, you MUST separate them by inserting a new descriptive `Threat Scenario` between them.

        </instructions>

        ### OUTPUT FORMAT (CRITICAL - FEW-SHOT EXAMPLE)
        You MUST output ONLY the interconnected paths using the EXACT syntax below. 
        NO INTRODUCTIONS. NO EXPLANATIONS. NO LIST OF NODES. 

        EXAMPLE OUTPUT:
        * [Threat Source: T1 - Malicious Caregiver] ---> (Vuln: CAPEC-533) ---> [Threat Scenario: Firmware Manipulation] ---> (Vuln: CWE-290) ---> [Threat Scenario: Lateral Pivot] ---> (Vuln: CVE-2022-24695) ---> [Unwanted Incident: DB Compromise] ---> [Asset: A3 - Health Data]
        * [Threat Source: T2 - Untrained Physician] ---> (Vuln: CAPEC-89) ---> [Threat Scenario: Credential Leak] ---> (Vuln: CWE-290) ---> [Threat Scenario: Lateral Pivot] ---> (Vuln: CWE-400) ---> [Unwanted Incident: System Outage] ---> [Asset: A2 - DBS Settings]
        """
        user_prompt = f"System description:\n{description}\n\nThreat Sources:\n{threats_text}\n\nTarget assets:\n{assets_text}\n\nIsolated Attack Paths to merge:\n{all_isolated_paths}"
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])
    
    def generate_human_readable_report(self, description: str, raw_graph_data: str, options: dict = None) -> str:
        """
        Takes the raw pseudo-code/graph data and rewrites it into a beautiful, executive-level Markdown report for human readers.

        Parameters : 
        - description : A description of the system
        - raw_graph_data : The list of previous exploration and convergance
        - options : A list of options of the user personalisation for risk analysis

        Returns : 
        - A readable Markdown report
        """

        supply_chain_directive = ""
        if options and options.get("supply_chain"):
            supply_chain_directive = """
            <supply_chain_focus>
            CRITICAL: This report is intended for Supply Chain Risk Management.
            1. In the "How" and "Unwanted Incidents" sections, emphasize third-party liability, data transit through vendors, and vendor access.
            2. For "Potential mitigations", you MUST provide Supply Chain-specific controls (e.g., Software Bill of Materials (SBOM), Zero-Trust Architecture for vendor access, SLA/Contractual penalties, Third-Party Security Audits, and strict API Gateway filtering).
            </supply_chain_focus>
            """
        
        system_prompt = f"""
        <role>
        You are a Cybersecurity Expert and Risk Management Analyst (CISO Advisor).
        Your task is to translate a technical threat model (a raw attack graph) into a clear, professional, and easy-to-read executive report.
        </role>

        {supply_chain_directive}

        <instructions>
        1. Generate the High-Level Risk Table. You MUST GROUP the data by Threat Source ("Who/What causes the risk?"). There must be EXACTLY ONE ROW per Threat Source. If a Threat Source is responsible for multiple paths/incidents, aggregate their data into that single row.
           * Columns required: Threat Source | Associated Risk IDs | How (briefly explain the vulnerabilities) | Unwanted Incidents | Impacted Assets | Vulnerabilities (CVEs & CWEs).
           * Example: If R1, R3, and R5 are all caused by "Malicious Caregiver", this Threat Source gets ONE row, and the Risk ID column will say "R1, R3, R5".

        2. Generate the Detailed Risks. Group the detailed blocks by Threat Source using the STRICT FORMAT TEMPLATE below. Do NOT create separate top-level blocks for the same Threat Source.
        
       3. You MUST output the detailed risks EXACTLY using this template. Do not change the headers. List all the vulnerabilties found in the risk path. Extract exactly the CWE and CVE ID and their score and severity. Generate a mitigation for all the threats_scenatios in the <technical_attack_path>.

            **Risk [ID]: [Name of the Risk]**
            * **Threat:** [Specify the threat actor/source]
            * **One or multiple consecutive interconnected Threat Scenarios:** 
            1. [Initial specific scenario step]
            2. [Intermediate scenario step - IDENTICAL text to other risks if they converge]
            3. [Final scenario step]
            * **Unwanted incidents:** [Exact name of the incident - IDENTICAL across converging risks]
            * **Impacted assets:** [List assets - IDENTICAL across converging risks]
            * **Associated CWEs:** [List exact CWEs from selection]
            * **Vulnerability Source (CVE/CAPEC):**
                * **[[Exact CVE/CAPEC ID]** ([Score] [Severity]) [Brief summary of the vulnerability]]
                    * Reason : [why it applies]
                * **[[Another Exact CVE/CAPEC ID]** ([Score] [Severity]) [Brief summary of the vulnerability]]
                    * Reason : [why it applies]
            * **Potential mitigations:** 
                * [Provide custom, technically accurate, and CLINICALLY SAFE mitigations tailored to the System Description. NEVER copy-paste generic advice like "turn off Bluetooth" for a continuous medical monitor. Offers several mitigation measures, which may be vague or specific, to allow the user to choose from among them.]
           ---
           
        4. READABILITY (CRITICAL): Do NOT use ANY pseudocode, raw arrows (`->`), or graph modeling jargon (no terms like “vertex,” “edge,” or “fan-in”). Use clear headings, bulleted lists, and bold important elements.
        5. TONE: Professional, objective, analytical, and geared toward "business/decision-makers."

        </instructions>
        """

        user_prompt = f"System description : \n <system_description>\n{description}\n</system_description>\n\n System Description : \n<technical_attack_paths>\n{raw_graph_data}\n</technical_attack_paths>"
        
        return self.llm.chat(
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

class LegalAssessor:
    """
    Agent responsible of generating textual legal slection and analysis.
    """

    def __init__(self, llm):
        self.llm = llm
        self.global_contexts = self._load_global_contexts()

    def _load_global_contexts(self):
        """
        Provided a global context for all the legal documents in the analysis to help the agent to understand each of the laws
        """

        try:
            with open("rag-docs/laws_contexts.json", "r", encoding="utf-8") as f:
                return json.load(f) 
        except FileNotFoundError:
            return {}
    
    def describe_for_legal(self, description: str) -> str :
        """
        Generate a list of keywords from a description summary to a legal RAG.

        Parameters:
        - description: A description of the target of analysis

        Returns:
        - A list of legal keywords
        """

        system_prompt = """
        <role>
        You are an expert IT Legal & Compliance Translator.
        Your task is to translate a System description (and its critical assets) into highly targeted REGULATORY and LEGAL search queries. Focus heavily on how the compromise of these specific assets breaches compliance.
        </role>

        <critical_rules>
        1. BE SURGICAL AND CONCISE: Extract a MAXIMUM of 10 highly distinct legal/compliance concepts.
        2. NO REPETITION: Do NOT generate variations of the same phrase. If you mention "Data Protection Impact Assessment" once, do not mention it again.
        3. RAG OPTIMIZATION: Instead of single disconnected words, write short, descriptive semantic phrases (e.g., "Failure to implement encryption at rest leading to unauthorized access of sensitive health data"). Embedding models understand descriptive intent better than keyword lists.
        4. Do NOT list the names of the laws themselves (e.g., do not write "GDPR" or "NIS2").
        </critical_rules>

        Output ONLY your short list of distinct legal concepts, one per line. No introduction.
        """

        user_prompt = f"System description : <description>\n{description}\n</description>"

        return self.llm.chat(
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}]
        )

    def assess(self, description: str, legal_context: str, technical_report: str = None,  options: dict = None) -> str:
        """
        Generate the all legal analysis depending on previous context and user selection.

        Parameters:
        - description: A description of the system
        - legal_context : The RAG result : a list a potential revelant compliance articles
        - technical_report : A previous technical report to proceed to analysis with technical context to link articles and risks
        - options : A list of options of the user personalisation for legal analysis

        Returns:
        - The legal analysis
        """

        if options is None:
            options = {}

        if not legal_context or not legal_context.strip():
            raise ValueError("legal_context empty")

        SUPPORTED_LAWS = list(self.global_contexts.keys())
        laws_involved = [law for law in SUPPORTED_LAWS if options.get(law)]

        dynamic_general_context = ""
        for law in laws_involved:
            if law in self.global_contexts:
                dynamic_general_context += f"--- CONTEXT FOR {law.upper()} ---\n{self.global_contexts[law]}\n\n"

        mode_instructions=[]
        if options.get("legal_first", False):
            critical_directive="""
            <critical_instruction>
            ABSOLUTE OBEDIENCE TO USER SELECTION:
            1. STRICT RESTRICTION: You MUST ONLY assess the specific laws and articles listed inside the <legal_context>.
            2. NO ADDITIONS: You are strictly forbidden from bringing in any other laws.
            3. ASSUME VALIDITY: Treat the selected laws as definitively breached. Explain *why* based on the <description> and the Assets targeted.
            </critical_instruction>
            """
            mode_instructions.append("""
            <mode_objective>
            Your mission is to justify the user's selected legal violations using EXPLICIT facts from the System Description.
            Cite the exact element (especially the compromised Assets) that proves the breach.
            </mode_objective>
            """)
        else:
            critical_directive="""
            <critical_directive>
            NO FORCED QUOTAS: Extract all valid, highly relevant legal risks. If only 1 or 2 apply, output only those.
            You must evaluate the laws listed in <legal_context> against the technical facts.
            </critical_directive>
            """
            mode_instructions.append("""
            <mode_objective>
            Your mission is to map the technical risks identified in the audit to the selected legal laws. 
            Connect specific technical `unwanted_incident` to the regulatory requirements.
            Specify in the result wich unwanted_incident or risks is linked with this article like this :
            * **[Law name] - [Article ID]:** [Summary of the law]
                * **Reason:** [Explain using a specific fact from the input texts]
                * **Unwanted incident wich breaches this articles :** [ID of unwanted incidents]
                * **Severity:** [CRITICAL / HIGH / MEDIUM]
            </mode_objective>
            """)

        if options.get("supply_chain", False):
            mode_instructions.append("- THIRD-PARTY LIABILITY FOCUS: Focus heavily on articles related to Sub-processors and Supply Chain Security.")
        
        mode_instruction_str = "\n".join(mode_instructions)
        tech_block = f"\n<technical_audit>\n{technical_report}\n</technical_audit>" if technical_report else ""  
        
        system_prompt = f"""
        <role>
        You are a strict IT Legal and Compliance Auditor.
        </role>

        <law_background>
        {dynamic_general_context}
        </law_background>

        {critical_directive}
        {mode_instruction_str}

        <formatting_rules>
        1. NO ESSAYS: DO NOT write any introduction, background context, or conclusion.
        2. NO GENERAL SUMMARIES: Do not write paragraphs explaining the laws generally.
        3. START IMMEDIATELY: Your response MUST start directly with "### Topic:".
        4. GROUPING: Group related articles together under broad, overarching topics.
        </formatting_rules>
            
        <inputs>
        {tech_block}
        </inputs>

        <output_format>
        You are a machine outputting a specific format. Output ONLY using this exact structure for each breached article:
        ### Topic: [Broad Category Name]
        * **[Law name] - [Article ID]:** [Summary of the law]
          * **Reason:** [Explain using a specific fact from the input texts]
          * **Severity:** [CRITICAL / HIGH / MEDIUM]
        </output_format>
        """

        user_prompt = f"""System description:
        {description}

        Legal Context:
        <legal_context>{legal_context}</legal_context>

        =========================================
        CRITICAL INSTRUCTIONS (READ CAREFULLY!):
        =========================================
        1. NO ESSAYS: DO NOT write any introduction, background context, or conclusion.
        2. START IMMEDIATELY: Your response MUST start directly with "### Topic:".
        3. FORMAT ONLY: You MUST output ONLY using this exact structure for each breached article:
        ### Topic: [Broad Category Name]
        * **[Law name] - [Article ID]:** [Summary of the law]
            * **Reason:** [Explain using a specific fact from the input texts]
            * **Severity:** [CRITICAL / HIGH / MEDIUM]
        Generate several topics.
        """
        return self.llm.chat(system=system_prompt, messages=[{"role": "user", "content": user_prompt}])
        