import json
import re

class Formatter:
    """
    Agent responsible of formatting the textual risk analysis into a specified format.
    """
    llm = None

    def __init__(self,llm):
        self.llm = llm

    def format(self, text: str) -> str:
        raise Exception("Invalid class: Formatter::format() not implemented")

class SimpleJSONFormatter(Formatter):
    """
    A formatter with the JSON schema used as a simplified representation of CORAS models.
    """
    def __init__(self, llm):
      super().__init__(llm)

    def _extract_mitigations_from_report(self, report_text: str) -> dict:
        """
        Extract only the mitigation generate in the report to create list for the CORAS model.

        Parameters : 
        - report_text : the all analysis with potential mitigations for each risks.

        Returns : 
        - A json list with all the mitigations for each risks.
        """
        mitigations_by_risk = {}
        current_risk = "Unknown_Risk"
        is_extracting = False
        
        if not report_text:
            return {}

        lines = report_text.split('\n')
        
        for line in lines:
            stripped_line = line.strip()
            
            if not stripped_line:
                continue
        
            cleaned_start = re.sub(r'^[#\*\s]+', '', stripped_line)
            
            if cleaned_start.lower().startswith('risk') and ':' in cleaned_start:
                current_risk = cleaned_start 
                if current_risk not in mitigations_by_risk:
                    mitigations_by_risk[current_risk] = []
                
                is_extracting = False
                continue
                
            if "potential mitigations" in stripped_line.lower():
                is_extracting = True
                
                parts = re.split(r'potential mitigations:', stripped_line, flags=re.IGNORECASE)
                if len(parts) > 1 and parts[1].strip():
                    clean_mit = re.sub(r'^[\*\-\+]\s*|^\d+\.\s*', '', parts[1]).strip()
                    clean_mit = clean_mit.replace('**', '').strip()
                    
                    if clean_mit and clean_mit != "*":
                        if current_risk not in mitigations_by_risk:
                            mitigations_by_risk[current_risk] = []
                        mitigations_by_risk[current_risk].append(clean_mit)
                continue
                
            if is_extracting:
                if stripped_line == '---' or (stripped_line.startswith('* **') and "potential mitigations" not in stripped_line.lower()):
                    is_extracting = False
                    continue
                    
                clean_mit = re.sub(r'^[\*\-\+]\s*|^\d+\.\s*', '', stripped_line).strip()
                clean_mit = clean_mit.replace('**', '').strip()
                
                if clean_mit and clean_mit != "*":
                    if current_risk not in mitigations_by_risk:
                        mitigations_by_risk[current_risk] = []
                    mitigations_by_risk[current_risk].append(clean_mit)
                    
        return {k: v for k, v in mitigations_by_risk.items() if len(v) > 0}

    def format(self, text: str, options: dict = None) -> str:
        """
        Generate the json CORAS model

        Parameters : 
        - text : The system description
        - options : A list of options of the user personalisation and generated report.

        Returns : 
        - The final json CORAS file.
        """

        if options is None:
            options = {}
        scope = options.get("scope", {})
        threats_data = scope.get("threats_source", [])
        assets_data = scope.get("assets", [])
        is_legal_coras = options.get("legal_coras", False)
        tech_report = options.get('tech_report',{})

        mitigation_extracted = self._extract_mitigations_from_report(options.get('tech_report',{}))
        mitigations_json_str = json.dumps(mitigation_extracted, indent=2)

        law_instruction = "You must absolutely link the laws provided in the context to its unwanted_incident"
        if is_legal_coras:
            law_instruction = """
            <critical_law_instruction>
            You MUST map the Laws/Regulations mentioned in the narrative as "law" vertices.
            
            CRITICAL EXTRACTION RULE FOR THE "text" FIELD:
            In the narrative, laws are formatted exactly like this:
            * **[Law Name]:** [Summary of the law]
              * **Reason:** [The precise explanation]
              * **Severity:** [Level]

            You MUST IGNORE the [Summary of the law].
            The "text" field of your JSON MUST contain ONLY the [Law Name] and the exact copy-pasted text from [The precise explanation], separated by exactly one '\\n'.
            DO NOT summarize. DO NOT include the word "Reason:".
            
            Example Input from narrative:
            * **GDPR Article 32:** The controller must implement appropriate measures...
              * **Reason:** The PDMonitor system lacks sufficient encryption at rest.
            
            Example Expected Output in JSON:
            "text": "GDPR Article 32\\nThe PDMonitor system lacks sufficient encryption at rest."
            </critical_law_instruction>
            """
            allowed_types = '"threat_scenario", "unwanted_incident", "human_threat_non_malicious", "human_threat_malicious", "non_human_threat", "asset", "mitigation", "law"'

            example = """
            {"vertices": [
                { "type": "human_threat_malicious", "id": "T1", "text": "Remote Attacker" },
                { "type": "threat_scenario", "id": "TS1", "text": "The attacker exploits an authentication bypass vulnerability to inject the wearable sensor with malicious firmware." },
                { "type": "unwanted_incident", "id": "UI1", "text": "Data Breach" },
                { "type": "asset", "id": "A1", "text": "Patient Database" },
                { "type": "law", "id": "L1", "text": "GDPR Article 32\\n The system, which monitors and transmits patient data, must ensure the security and integrity of this data to prevent unauthorized access or breaches." },
                { "type": "mitigation", "id": "M1", "text": "Use secure communication channels and protocols", },
                ],
            "edges": [
                { "source": "T1", "target": "TS1", "vulnerabilities": ["CWE-290"] },
                { "source": "TS1", "target": "UI1", "vulnerabilities": [] },
                { "source": "UI1", "target": "A1", "vulnerabilities": [] },
                { "source": "UI1", "target": "L1", "vulnerabilities": [] }
                { "source": "M1", "target": "TS1", "vulnerabilities": [] },
            ]
            }
            """
        else :

            law_instruction = """
            <critical_law_instruction>
            DO NOT CREATE ANY "law" vertices. Legal compliance is out of scope for this analysis.
            </critical_law_instruction>
            """
            allowed_types = '"threat_scenario", "unwanted_incident", "human_threat_non_malicious", "human_threat_malicious", "non_human_threat", "asset", "mitigation"'
            example = """
            {"vertices": [
                { "type": "human_threat_malicious", "id": "T1", "text": "Remote Attacker" },
                { "type": "threat_scenario", "id": "TS1", "text": "The attacker exploits an authentication bypass vulnerability to inject the wearable sensor with malicious firmware." },
                { "type": "unwanted_incident", "id": "UI1", "text": "Data Breach" },
                { "type": "asset", "id": "A1", "text": "Patient Database" },
                { "type": "mitigation", "id": "M1", "text": "Use secure communication channels and protocols", },
                ],
            "edges": [
                { "source": "T1", "target": "TS1", "vulnerabilities": ["CWE-290"] },
                { "source": "TS1", "target": "UI1", "vulnerabilities": [] },
                { "source": "UI1", "target": "A1", "vulnerabilities": [] },
                { "source": "M1", "target": "TS1", "vulnerabilities": [] },
                ]
            }
            """

        system_prompt = f"""
        <role>
        You are an expert Graph Topology Builder. Your job is to convert a textual threat model narrative into a highly interconnected Directed Acyclic Graph (DAG) in JSON format.
        </role>

        ### ABSOLUTE CRITICAL RULES:
        1. ALLOWED VERTEX TYPES ONLY: Every vertex you create MUST use one of the allowed types. Do not invent new types like "Risk" or "Vulnerability".
        2. VULNERABILITIES PLACEMENT: Vulnerability identifiers (like CVE or CWE) MUST ONLY be placed as an array of strings inside the `vulnerabilities` property of an edge.
        3. STRICT CORAS FLOW: The graph MUST flow directionally. 
        4. EDGE CONNECTIONS:
            - `threat_source` MUST target `threat_scenario`.
            - `threat_scenario` MUST target another `threat_scenario` OR an `unwanted_incident`. 
            - `unwanted_incident` MUST target `asset` OR `law`.
            - `mitigation` MUST target a `threat_scenario` (to prevent it).
        4. VULNERABILITY PLACEMENT: The `vulnerabilities` array on an edge MUST contain pure IDs ONLY. ONLY edges where the target is a `threat_scenario` can have vulnerabilities. Otherwise, it MUST be exactly `[]`.
        5. DESCRIPTIVE THREAT SCENARIOS (CRITICAL): The "text" field for any "threat_scenario" MUST be a full, descriptive phrase or sentence explaining how the action occurs in context (e.g. 6 to 15 words). DO NOT use short 2-3 word titles like "JSON Hijacking".
        
        You MUST output ONLY a valid JSON object. 
        YOUR JSON MUST CONTAIN EXACTLY TWO ROOT KEYS: "vertices" and "edges".
        <anti_hallucination_rules>
        - DO NOT create a "threat_sources" key.
        - DO NOT create a "laws_and_regulations" key.
        - DO NOT create a "mitigations" key.
        - ALL information must be mapped INSIDE the "vertices" array (as nodes) and the "edges" array (as relationships).
        </anti_hallucination_rules>


        ### OUTPUT FORMAT (CRITICAL - DO NOT INVENT SCHEMA)
        You are a Graph Extractor, NOT a report converter.
        DO NOT convert the "High-Level Risk Table" or "Detailed Risks" into JSON arrays.
        DO NOT create keys like "highLevelRiskTable", "detailedRisks", "mitigations", or "threatSources".
        
        YOUR ENTIRE JSON OUTPUT MUST MATCH EXACTLY THIS SCHEMA AND NOTHING ELSE:
        {{
          "vertices": [
            {{ "id": "...", "type": "...", "text": "..." }}
          ],
          "edges": [
            {{ "source": "...", "target": "...", "vulnerabilities": ["..."] }}
          ]
        }}

        Every vertex MUST have an "id", a "type", and a "text".
        ALLOWED VERTICE TYPES: {allowed_types}.
        
        ### EXAMPLE OF CORRECT AND ONLY ACCEPTABLE OUTPUT:
        {example}
        """

        human_prompt = f"""Parse the following report into the final DAG JSON.
        
        ### FINAL CHECKLIST BEFORE OUTPUT (DO NOT FAIL):
        1. FLOW CHECK: Look at your edges. Did you link a `threat_scenario` directly to an `asset`? IF YES, YOU MUST CHANGE THE TARGET TO AN `unwanted_incident`!
        2. VULN CHECK: Do not create ANY node with type "vulnerability". DON'T FORGET TO PUT VULNERABILITIES PROVIDEDIN THE CONTEXT IN THE FINAL RESULT.
        3. SCOPE CHECK: Ensure the original threats and target assets provided below are explicitly present in the graph using their original IDs.
        4. Follow the CORAS rules : a risk bin with a threats_source, a threats_source must lead to one or several threats_scenario, a threat_scenario can lead to one or several other threats_scenario, a threat_scenario must lead to an unwanted_incident and unwanted_incident can lead to other unwanted_incident, laws lust be linked to unwanted_incident, and unwanted_incident must lead to assets.
        5. MITIGATIONS INTEGRATION: You MUST extract mitigations from {mitigations_json_str} and put all the mitigations for a risk into different vertices.
        6. The final result must be a DAG, don't put arrows in both direction, only in the direction to threats_source to assets.

        No items have to be alone and no linked !

        {law_instruction}

        <critical_input_scope>
        Ensure the original threats: {json.dumps(threats_data)}. Use the exact type of threats_source provided.
        and the target assets: {json.dumps(assets_data)}
        are explicitly present in the graph and connected.
        </critical_input_scope>

        <text_description>
        {text}
        </text_description>
        <analysis>
        {tech_report}
        </analysis>
        """

        print("Formatting the aggregated paths into JSON DAG via Universal LLM Adapter...")
        
        try:
            response_text = self.llm.chat(
                system=system_prompt,
                messages=[{"role": "user", "content": human_prompt}],
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
            
            result_dict = json.loads(clean_json)
                    
            if "nodes" in result_dict and "vertices" not in result_dict:
                result_dict["vertices"] = result_dict.pop("nodes")
                
            if "vertices" not in result_dict:
                result_dict["vertices"] = []
            if "edges" not in result_dict:
                result_dict["edges"] = []
                
            node_types = {str(v.get("id")): v.get("type") for v in result_dict.get("vertices", []) if "id" in v}
            valid_ids = set(node_types.keys())
            
            safe_edges = []
            generated_uis = 0
            
            for edge in result_dict.get("edges", []):
                source = str(edge.get("source"))
                target = str(edge.get("target"))
                
                if source in valid_ids and target in valid_ids:
                    s_type = node_types.get(source)
                    t_type = node_types.get(target)
                    
                    if s_type == "threat_scenario" and t_type == "asset":
                        print(f"⚠️ CORAS rules not applied by the LLM : {source} -> {target}. Auto-correction...")
                        
                        ui_id = f"UI_auto_generated_{generated_uis}"
                        generated_uis += 1
                        
                        result_dict["vertices"].append({
                            "id": ui_id,
                            "type": "unwanted_incident",
                            "text": f"Compromise of asset {target}"
                        })
                        valid_ids.add(ui_id)
                        node_types[ui_id] = "unwanted_incident"
                        
                        safe_edges.append({
                            "source": source,
                            "target": ui_id,
                            "vulnerabilities": edge.get("vulnerabilities", [])
                        })
                        
                        safe_edges.append({
                            "source": ui_id,
                            "target": target,
                            "vulnerabilities": []
                        })
                        
                    else:
                        safe_edges.append(edge)
                else:
                    print(f"⚠️ Ghost link deleted : {source} -> {target}")
                    
            result_dict["edges"] = safe_edges
            
            
            return json.dumps(result_dict, indent=2)
              
        except Exception as e:
            print(f"Error during formatting: {e}")
            if 'response_text' in locals():
                print(f"Raw output was:\n{response_text}")
            return json.dumps({"vertices": [], "edges": []})
            