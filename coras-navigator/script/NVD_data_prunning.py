import json
import os
import glob

NAVIGATOR_DIR = "./"
RAG_DOCS_DIR = f"{NAVIGATOR_DIR}rag-docs/"
NVD_DOCS_DIR = f"{RAG_DOCS_DIR}NVD-2019-2026/"


def clean_nvd(file_input, file_output):
    print(f"clean of {file_input}...")
    
    with open(file_input, 'r', encoding='utf-8') as f:
        data = json.load(f)

    cves_cleaned = []

    for item in data.get('vulnerabilities', []):
        cve = item.get('cve', {})
        
        cve_id = cve.get('id', 'Unknown')

        desc_en = ""
        for desc in cve.get('descriptions', []):
            if desc.get('lang') == 'en':
                desc_en = desc.get('value')
                break

        cwes = []
        for weakness in cve.get('weaknesses', []):
            for desc in weakness.get('description', []):
                if desc.get('lang') == 'en':
                    cwes.append(desc.get('value'))

        metrics = cve.get('metrics', {})
        metrics_data = {}
        
        if 'cvssMetricV40' in metrics:
           cvss = metrics['cvssMetricV40'][0]['cvssData']
           metrics_data = {
               "version": "4.0",
               "severity": cvss.get('baseSeverity', 'UNKNOWN'),
               "score": cvss.get('baseScore', 0.0),
               "attack_vector": cvss.get('attackVector', 'UNKNOWN'),
               "impact_confidentiality": cvss.get('vulnConfidentialityImpact', 'UNKNOWN'),
               "impact_integrity": cvss.get('integrityImpact', 'UNKNOWN'),
               "impact_availability": cvss.get('vulnAvailabilityImpact', 'UNKNOWN'),
               "safety_hazard": cvss.get('Safety', 'NOT_DEFINED')
            }
        elif 'cvssMetricV31' in metrics:
            cvss = metrics['cvssMetricV31'][0]['cvssData']
            metrics_data = {
                "version": "3.1",
                "severity": cvss.get('baseSeverity', 'UNKNOWN'),
                "score": cvss.get('baseScore', 0.0),
                "attack_vector": cvss.get('attackVector', 'UNKNOWN'),
                "impact_confidentiality": cvss.get('confidentialityImpact', 'UNKNOWN'),
                "impact_integrity": cvss.get('integrityImpact', 'UNKNOWN'),
                "impact_availability": cvss.get('availabilityImpact', 'UNKNOWN'),
                "safety_hazard": "NOT_SUPPORTED"
            }
        elif 'cvssMetricV30' in metrics:
            cvss = metrics['cvssMetricV30'][0]['cvssData']
            metrics_data = {
                "version": "3.0",
                "severity": cvss.get('baseSeverity', 'UNKNOWN'),
                "score": cvss.get('baseScore', 0.0),
                "attack_vector": cvss.get('attackVector', 'UNKNOWN'),
                "impact_confidentiality": cvss.get('confidentialityImpact', 'UNKNOWN'),
                "impact_integrity": cvss.get('integrityImpact', 'UNKNOWN'),
                "impact_availability": cvss.get('availabilityImpact', 'UNKNOWN'),
                "safety_hazard": "NOT_SUPPORTED"
            }
        elif 'cvssMetricV2' in metrics:
            cvss = metrics['cvssMetricV2'][0]['cvssData']
            metrics_data = {
                "version": "2.0",
                "severity": cvss.get('baseSeverity', 'UNKNOWN'),
                "score": cvss.get('baseScore', 0.0),
                "attack_vector": cvss.get('attackVector', 'UNKNOWN'),
                "impact_confidentiality": cvss.get('confidentialityImpact', 'UNKNOWN'),
                "impact_integrity": cvss.get('integrityImpact', 'UNKNOWN'),
                "impact_availability": cvss.get('availabilityImpact', 'UNKNOWN'),
                "safety_hazard": "NOT_SUPPORTED"
            }

        cves_cleaned.append({
            "id": cve_id,
            "cwes": cwes,
            "metrics": metrics_data,
            "content": desc_en
        })

    with open(file_output, 'w', encoding='utf-8') as f:
        json.dump(cves_cleaned, f, indent=4)
        
    print(f"Finish ! {len(cves_cleaned)} CVEs loaded and cleaned.")

if __name__ == "__main__":
    nvd_files = glob.glob(os.path.join(NVD_DOCS_DIR, "*.json"))
    for nvd_path in nvd_files:
        filename = os.path.basename(nvd_path)
        filename_without_ext = os.path.splitext(filename)[0]
        output_path = os.path.join(RAG_DOCS_DIR, f"{filename_without_ext}.json")
        clean_nvd(nvd_path, output_path)