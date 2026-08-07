import React from "react";

// Render Markdown
import ReactMarkdown from "react-markdown";
// Markdown tables
import remarkGfm from "remark-gfm";

import "./navigator.css";

import Editor from "../Editor/Editor";
import FileUpload from "./FileUpload";
import CorasReport from "./Report";

import { svgStringToImage } from "./Report.js";
import ScopeSelector from "./ScopeSelector.jsx";
import { naturalLanguageFromThreatModel } from "../Editor/DAG.js";

import lawsData from "../../../../../../coras-navigator/rag-docs/laws_contexts.json";
import { clickProps } from "react-native-web/dist/cjs/modules/forwardedProps/index.js";

const CORAS_NAVIGATOR_IP = "localhost";
const CORAS_NAVIGATOR_PORT = 5242;

class Navigator extends React.Component {
  constructor(props) {
    super(props);
    this.editorRef = React.createRef();

    this.onCorasModelSelect = this.onCorasModelSelect.bind(this);
    this.onContextDescriptionInputValueChange =
      this.onContextDescriptionInputValueChange.bind(this);
    this.onGenerateSummaryButtonClick =
      this.onGenerateSummaryButtonClick.bind(this);
    this.onSummaryAccurateNoButtonClick =
      this.onSummaryAccurateNoButtonClick.bind(this);
    this.onFileElementRemoveButtonClick =
      this.onFileElementRemoveButtonClick.bind(this);
    this.onDisplayContextButtonClick =
      this.onDisplayContextButtonClick.bind(this);
    this.onIncludeGeneratedModelCheckboxChange =
      this.onIncludeGeneratedModelCheckboxChange.bind(this);
    this.generatePdfReport = this.generatePdfReport.bind(this);
    // this.onStartSelection = this.onStartSelection.bind(this);
    this.onScopeValidated = this.onScopeValidated.bind(this);
    // this.onFinalReportGenerate = this.onFinalReportGenerate.bind(this);
    this.prevScrollY = 0;

    const dynamicLaws = {};
    const lawNames = Object.keys(lawsData);
    lawNames.forEach((law) => {
      dynamicLaws[law] = law === "GDPR";
    });

    this.state = {
      showSettingsModal: false,
      llmProvider: "ollama",
      llmModel: "",
      llmApiKey: "",
      llmBaseUrl: "",

      workflowSteps: [
        "1. Context",
        "2. Summary",
        "3. Scope Selection",
        // "4. Risk Selection",
        "4. Analysis",
        "5. CORAS Model",
      ],
      currentStep: 0,
      unlockedStep: 0,
      isBlankEditorMode: false,
      // User input
      files: [],
      corasModelFilename: "",
      contextDescription: "",

      // Scope variable
      scopeData: null,
      selectedScope: null,
      displayScopeStatusMessage: false,
      scopeStatusMessage: "Extracting Threat Sources and Assets...",

      // Generated
      // selectionRisks: null,
      corasModelTranscription: "",
      summary: "",
      analysis: "",
      retrievedContext: "",
      generatedModel: null,

      // Controls
      checked: true,
      isSwitchLegalOn: false,
      isSwitchLegalPriorityOn: false,
      isSupplyChainOn: false,
      laws: dynamicLaws,

      errorMessage: "",
      loading: false,
      includeGeneratedModelInSummary: false,

      displaySummaryStatusMessage: false,
      summaryStatusMessage: "Generating summary...",

      displayAnalysisStatusMessage: false,
      analysisStatusMessage: "Generating analysis...",

      displayContext: false,

      displayModelStatusMessage: false,
      modelStatusMessage: "Generating CORAS Threat Model...",

      isNavVisible: true,

      submittedContextDescription: "",
      submittedLaws: null,
      submittedLegalPriorityOn: null,
      techReport: "",
      legalReport: "",
      existing_tech_report: "",
      existing_legal_report: "",
      // lastSelectedIds: null,
    };
  }

  componentDidMount() {
    this.abortController = new AbortController();
    this._isMounted = true;
    this.prevScrollY = window.scrollY;
    window.addEventListener("scroll", this.handleScroll);
  }

  componentWillUnmount() {
    this.abortController.abort();
    this._isMounted = false;
    window.removeEventListener("scroll", this.handleScroll);
  }

  handleScroll = () => {
    if (window.innerWidth <= 768) {
      const currentScroll =
        window.scrollY || document.documentElement.scrollTop;

      if (currentScroll > this.prevScrollY && currentScroll > 50) {
        if (this.state.isNavVisible) {
          this.setState({ isNavVisible: false });
        }
      } else {
        if (!this.state.isNavVisible) {
          this.setState({ isNavVisible: true });
        }
      }
      this.prevScrollY = currentScroll <= 0 ? 0 : currentScroll;
    } else {
      if (!this.state.isNavVisible) {
        this.setState({ isNavVisible: true });
      }
    }
  };

  handleWorkflowStepClick = (index) => {
    if (index <= this.state.unlockedStep) {
      this.setState({ currentStep: index });
    }
  };

  onCorasModelSelect(file) {
    if (this.state.loading) return;
    if (!file) return;

    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = (event) => {
      try {
        const text = naturalLanguageFromThreatModel(
          JSON.parse(event.target.result),
        );
        console.log(text);
        this.setState({
          corasModelTranscription: text,
          corasModelFilename: file.name,
          checked: false,
        });
      } catch (error) {
        console.error("Failed to load file: " + error);
      }
    };
    reader.onerror = (event) => {
      console.log("Error while reading CORAS Threat Model file");
      this.setState({
        corasModelTranscription: "",
        corasModelFilename: "",
      });
    };
  }

  onContextDescriptionInputValueChange(event) {
    this.setState({ contextDescription: event.target.value });
  }

  onSummaryAccurateNoButtonClick() {
    this.setState({
      loading: false,
      displaySummaryStatusMessage: true,
      summaryStatusMessage:
        "Please edit the context description of your system (provide more detail like the versions if you want a complete analysis).",
    });
  }

  loadedFileElementToRender(filename, key) {
    let id = "remove-file-button-FILENAME-" + filename;
    return (
      <div className="file-square" key={key}>
        <button
          className="remove-file"
          id={id}
          onClick={this.onFileElementRemoveButtonClick}
        >
          ×
        </button>
        <p className="file-name">{filename}</p>
      </div>
    );
  }

  loadedFilesElementsToRender() {
    let fileElements = [];
    let index = 0;
    for (let filename of this.state.files) {
      fileElements.push(this.loadedFileElementToRender(filename, index));
      index += 1;
    }

    if (this.state.corasModelFilename !== "") {
      fileElements.push(
        this.loadedFileElementToRender(
          this.state.corasModelFilename,
          index + 1,
        ),
      );
    }

    return <div className="files-list">{fileElements}</div>;
  }

  onDisplayContextButtonClick() {
    this.setState({
      displayContext: !this.state.displayContext,
    });
  }

  statusMessage(condition, message) {
    if (!condition || !message) {
      return null;
    }
    const isError = !this.state.loading && message !== "";
    return (
      <div
        className={
          isError ? "error-alert" : "navigator-status-message-container"
        }
      >
        {this.state.loading ? (
          <div className="animated-loading-element"></div>
        ) : null}
        <p style={{ margin: 0 }}>{isError ? `⚠️ ${message}` : message}</p>
      </div>
    );
  }

  onIncludeGeneratedModelCheckboxChange() {
    const checked = this.state.checked;
    this.setState({
      checked: !checked,
    });
  }

  generatePdfReport() {
    let svg = this.editorRef.current.getSvg();
    const report = new CorasReport();

    report
      .addSubTitle("Input description of the target of analysis: ")
      .addParagraph(this.state.contextDescription)
      .addSubTitle("Structured description of the target of analysis: ")
      .addParagraph(this.state.summary)
      .addSubTitle("Retrieved context for the risk analysis: ")
      .addParagraph(this.state.retrievedContext)
      .addSubTitle("Risk analysis: ")
      .addParagraph(this.state.analysis)
      .addSubTitle("CORAS Threat model: ");

    svgStringToImage(svg.source, 2000, 2000).then((pngSrc) => {
      report
        .addPNG(pngSrc, svg.width, svg.height, "threat_model")
        .generate("report.pdf");
    });
  }

  onOpenBlankEditorButtonClick = () => {
    this.setState({
      isBlankEditorMode: true,
      generatedModel: null,
      loading: false,
    });

    if (this.editorRef.current) {
      setTimeout(() => {
        this.editorRef.current.clearGraph();
        this.editorRef.current.changeGraph("threat");
      }, 100);
    }
  };

  onBackToWorkflowButtonClick = () => {
    this.setState({
      isBlankEditorMode: false,
    });
  };

  /*********************** Context parameters ********************/

  onSwitchToggle = (stateKey) => (event) => {
    this.setState({ [stateKey]: event.target.checked });
  };

  toggleSupplyChain = () => {
    this.setState((prevState) => ({
      isSupplyChainOn: !prevState.isSupplyChainOn,
    }));
  };

  toggleLaws = (lawName) => () => {
    this.setState((prevState) => ({
      laws: {
        ...prevState.laws,
        [lawName]: !prevState.laws[lawName],
      },
    }));
  };

  toggleSettingsModal = () => {
    this.setState((prevState) => ({
      showSettingsModal: !prevState.showSettingsModal,
    }));
  };

  handleLlmSettingChange = (event) => {
    const { name, value } = event.target;
    if (name === "llmProvider") {
      this.setState({
        [name]: value,
        llmModel: "",
      });
    } else {
      this.setState({
        [name]: value,
      });
    }
  };

  getBaseOptions = () => {
    return {
      llm_provider: this.state.llmProvider,
      llm_model: this.state.llmModel,
      llm_api_key: this.state.llmApiKey,
      llm_base_url: this.state.llmBaseUrl,
      legal_coras: this.state.isSwitchLegalOn,
      legal_first: this.state.isSwitchLegalPriorityOn,
      GDPR: this.state.laws.GDPR,
      AI_Act: this.state.laws.AI_Act,
      Cybersecurity_Act: this.state.laws.Cybersecurity_Act,
      CyberResilience_Act: this.state.laws.Cyber_Resilience_Act,
      NIS2: this.state.laws.NIS2,
      supply_chain: this.state.isSupplyChainOn,
      tech_report: this.state.techReport,
      legal_report: this.state.legalReport,
      scope: this.state.selectedScope,
    };
  };

  /*********************** BackEnd Information ********************/

  onFileElementRemoveButtonClick(event) {
    const filename = event.target.id.split("-FILENAME-").at(-1);
    if (filename === this.state.corasModelFilename) {
      this.setState({
        corasModelFilename: "",
        corasModelTranscription: "",
      });
      return;
    }

    this.setState((prevState) => ({
      files: prevState.files.filter((f) => f !== filename),
    }));

    fetch(
      "http://" +
        CORAS_NAVIGATOR_IP +
        ":" +
        CORAS_NAVIGATOR_PORT +
        "/coras_navigator_api/remove_file",
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          "filename-to-remove": filename,
        }),
      },
    )
      .then((response) => {
        if (response.ok) {
          response.json().then((response_json) => {
            console.log(response_json);
          });
        } else {
          throw Error("Something went wrong");
        }
      })
      .catch((error) => {
        console.log(error);
      });
  }

  onGenerateSummaryButtonClick() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    const { laws } = this.state;
    const hasSelectedAtLeastOneLaw = Object.values(laws).some(
      (isSelected) => isSelected === true,
    );

    if (this.state.isSwitchLegalOn && !hasSelectedAtLeastOneLaw) {
      this.setState({
        errorMessage:
          "Please select at least one law to start the legal analysis.",
      });
      return;
    }
    this.setState({ errorMessage: "" });

    const contextChanged =
      this.state.contextDescription !== this.state.submittedContextDescription;
    const priorityChanged =
      this.state.isSwitchLegalPriorityOn !==
      this.state.submittedLegalPriorityOn;
    const lawsChanged =
      JSON.stringify(this.state.laws) !==
      JSON.stringify(this.state.submittedLaws);

    this.setState({
      submittedContextDescription: this.state.contextDescription,
      submittedLaws: { ...this.state.laws },
      submittedLegalPriorityOn: this.state.isSwitchLegalPriorityOn,
    });

    if (contextChanged || !this.state.summary) {
      this.setState({
        summaryStatusMessage:
          "Generating a structured description of the system...",
        displaySummaryStatusMessage: true,
        loading: true,
        selectionRisks: null,
        selectionContext: null,
        selectionType: null,
        lastSelectedIds: null,
        techReport: "",
        legalReport: "",
        analysis: "",
        generatedModel: null,
        summary: "",
        unlockedStep: 1,
        currentStep: 1,
      });

      let modelTranscription = this.state.corasModelTranscription;
      if (this.state.checked && this.state.generatedModel != null) {
        this.setState({ files: [] });
        modelTranscription = naturalLanguageFromThreatModel(
          this.state.generatedModel,
        );
      }

      let contextDescription = this.state.contextDescription;
      if (modelTranscription !== "") {
        contextDescription += "\nExisting threat model:\n" + modelTranscription;
      }
      const payload = {
        "context-description": contextDescription,
        options: this.getBaseOptions(),
      };

      fetch(
        `http://${CORAS_NAVIGATOR_IP}:${CORAS_NAVIGATOR_PORT}/coras_navigator_api/generate_summary`,
        {
          headers: { "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify(payload),
          signal: this.abortController?.signal,
        },
      )
        .then(async (response) => {
          if (!response.ok) {
            let errorMessage = "Something went wrong.";
            try {
              const errData = await response.json();
              if (errData.error) errorMessage = errData.error;
            } catch (e) {}
            throw new Error(errorMessage);
          }
          return response.json();
        })
        .then((response_json) => {
          this.setState({
            summary: response_json["summary"],
            displaySummaryStatusMessage: false,
            loading: false,
            unlockedStep: Math.max(this.state.unlockedStep, 1),
            currentStep: 1,
          });
        })
        .catch((error) => {
          if (error.name === "AbortError") return;
          console.log(error);
          this.setState({
            summaryStatusMessage: error.message,
            displaySummaryStatusMessage: true,
            loading: false,
          });
        });
    } else if (
      priorityChanged ||
      (lawsChanged && this.state.isSwitchLegalPriorityOn)
    ) {
      this.setState({
        unlockedStep: Math.max(this.state.unlockedStep, 1),
        currentStep: 1,
        selectionRisks: null,
        selectionContext: null,
        selectionType: null,
        lastSelectedIds: null,
        techReport: "",
        legalReport: "",
        analysis: "",
        generatedModel: null,
      });
    } else if (lawsChanged && !this.state.isSwitchLegalPriorityOn) {
      this.setState({
        unlockedStep: Math.max(this.state.unlockedStep, 2),
        currentStep: 2,
        legalReport: "",
        analysis: "",
        generatedModel: null,
      });
    } else {
      this.setState({ currentStep: this.state.unlockedStep });
    }
  }

  onStartScope = () => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    this.setState({
      loading: true,
      displayScopeStatusMessage: true,
      unlockedStep: 2,
      currentStep: 2,
      validatedScope: null,
      scopeData: null,
    });

    fetch(
      `http://${CORAS_NAVIGATOR_IP}:${CORAS_NAVIGATOR_PORT}/coras_navigator_api/generate_scope_selection`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify({
          summary: this.state.summary,
          options: this.getBaseOptions(),
        }),
        signal: this.abortController?.signal,
      },
    )
      .then((response) => response.json())
      .then((data) => {
        const safeScopeData = {
          threats_source: data.threats_source || data.threats || [],
          assets: data.assets || [],
        };
        this.setState({
          loading: false,
          displayScopeStatusMessage: false,
          scopeData: safeScopeData,
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error(error);
        this.setState({
          loading: false,
          scopeStatusMessage: "Error extracting scope.",
        });
      });
  };

  onScopeValidated = (validatedScope) => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    const scopeChanged =
      JSON.stringify(validatedScope) !==
      JSON.stringify(this.state.selectedScope);
    let techToKeep = this.state.techReport || "";
    let legalToKeep = this.state.legalReport || "";
    if (scopeChanged) {
      techToKeep = "";
      legalToKeep = "";
    }
    this.setState({
      loading: true,
      analysis: "",
      displayAnalysisStatusMessage: true,
      analysisStatusMessage:
        "Generating the complete kill-chain and analysis...",
      unlockedStep: 3,
      currentStep: 3,
      selectedScope: validatedScope,
      techReport: techToKeep,
      legalReport: legalToKeep,
    });

    const options = {
      ...this.getBaseOptions(),
      legal_coras: this.state.isSwitchLegalOn,
      legal_first: this.state.isSwitchLegalPriorityOn,
      GDPR: this.state.laws.GDPR,
      AI_Act: this.state.laws.AI_Act,
      Cybersecurity_Act: this.state.laws.Cybersecurity_Act,
      CyberResilience_Act: this.state.laws.Cyber_Resilience_Act,
      NIS2: this.state.laws.NIS2,
      supply_chain: this.state.isSupplyChainOn,
      scope: validatedScope,
    };

    const payload = {
      summary: this.state.summary,
      options: options,
      existing_tech_report: techToKeep,
      existing_legal_report: legalToKeep,
    };

    fetch(
      `http://${CORAS_NAVIGATOR_IP}:${CORAS_NAVIGATOR_PORT}/coras_navigator_api/generate_risks`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(payload),
        signal: this.abortController?.signal,
      },
    )
      .then((response) => response.json())
      .then((data) => {
        let safeAnalysis = data.analysis
          ? String(data.analysis)
          : "No report generated.";
        safeAnalysis = safeAnalysis.replace(
          /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
          "",
        );
        if (this._isMounted) {
          this.setState(
            {
              loading: false,
              analysis: safeAnalysis,
              displayAnalysisStatusMessage: false,
              techReport: data.technical_analysis,
              legalReport: data.compliance_analysis,
            },
            () => {
              this.fetchThreatModel();
            },
          );
        }
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        if (this._isMounted) {
          console.error(error);
          this.setState({
            loading: false,
            analysisStatusMessage: "Analysis error",
          });
        }
      });
  };

  fetchThreatModel = () => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
    this.setState({
      displayModelStatusMessage: true,
      modelStatusMessage: "Generating CORAS Threat Model...",
      loading: true,
      generatedModel: "",
    });

    const payload = {
      "risk-analysis": this.state.analysis,
      options: this.getBaseOptions(),
    };

    fetch(
      `http://${CORAS_NAVIGATOR_IP}:${CORAS_NAVIGATOR_PORT}/coras_navigator_api/generate_coras_model`,
      {
        headers: { "Content-Type": "application/json" },
        method: "POST",
        body: JSON.stringify(payload),
        signal: this.abortController?.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          let errorMessage = "Erreur serveur HTTP " + response.status;
          try {
            const errData = await response.json();
            if (errData.error) errorMessage = errData.error;
          } catch (e) {}
          throw new Error(errorMessage);
        }
        return response.json();
      })
      .then((response_json) => {
        let generatedModel = null;

        try {
          let corasData = response_json["coras_model"];

          if (!corasData || corasData === "") {
            throw new Error("Empty graph");
          }

          if (typeof corasData === "string") {
            corasData = JSON.parse(corasData);
          }

          console.log("JSON CORAS clean and secure :", corasData);

          this.editorRef.current.changeGraph("threat");
          generatedModel = this.editorRef.current.changeGraphFromDAG(corasData);
        } catch (err) {
          console.error("critical error during formating:", err);
        }

        this.setState({
          displayModelStatusMessage: false,
          loading: false,
          unlockedStep: Math.max(this.state.unlockedStep, 5),
          generatedModel: generatedModel,
          checked: true,
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        console.error("Erreur globale ThreatModel:", error);
        this.setState({
          loading: false,
          modelStatusMessage: "Something went wrong.",
          displayModelStatusMessage: true,
        });
      });
  };

  /*********************** Tabs Render ********************/

  renderContext() {
    const availableLaws = Object.keys(this.state.laws);
    return (
      <div id="coras-navigator">
        <div className="one-line">
          <p>
            Please provide a context description of your system (provide more
            detail like the versions if you want a complete analysis):
          </p>
          <div className="file-uploads">
            {this.state.generatedModel != null && (
              <label>
                <input
                  type="checkbox"
                  checked={this.state.checked}
                  onChange={this.onIncludeGeneratedModelCheckboxChange}
                />
                Include generated CORAS Threat Model
              </label>
            )}

            <FileUpload
              title="Upload a CORAS Threat Model"
              onFileSelect={this.onCorasModelSelect}
              disabled={this.state.loading}
            />
          </div>
          <div className="action-buttons">
            <button onClick={this.toggleSettingsModal} id="setting-btn">
              LLM Settings
            </button>
          </div>
        </div>
        <div className="context-description">
          {!this.state.isSwitchLegalOn
            ? "The assesment will be only technical (CVE, CAPEC, CWE)"
            : this.state.isSwitchLegalPriorityOn
              ? "The assessment will initially be legal first and will be accompanied by an automatically generated technical analysis to explain how these articles may be breached."
              : "The assessment will initially be technical and will be accompanied by an automatically generated compliance analysis to identify the articles of laws that may be breached as a result of the risks detected."}
        </div>
        {this.loadedFilesElementsToRender && this.loadedFilesElementsToRender()}

        <textarea
          placeholder="We are developing..."
          onChange={this.onContextDescriptionInputValueChange}
        ></textarea>

        <div className="preference-section">
          <div className="toggle-preference">
            <label className="switch">
              <input
                type="checkbox"
                checked={this.state.isSwitchLegalOn || false}
                onChange={this.onSwitchToggle("isSwitchLegalOn")}
              />
              <span className="slider round"></span>
            </label>
            <span className="switch-label">Switch to legal CORAS</span>
          </div>
          {this.state.isSwitchLegalOn && (
            <div className="legal-sub-options">
              <div
                className="toggle-priority"
                style={{
                  marginTop: "15px",
                  marginBottom: "15px",
                  marginLeft: "10px",
                }}
              >
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={this.state.isSwitchLegalPriorityOn || false}
                    onChange={this.onSwitchToggle("isSwitchLegalPriorityOn")}
                  />
                  <span className="slider round"></span>
                </label>
                <span className="switch-label">
                  Switch to legal compliance priority
                </span>
              </div>
              <div className="laws-preference">
                {availableLaws.map((lawName) => {
                  const tooltipText =
                    lawsData[lawName]?.tooltip || "Description not available.";
                  return (
                    <button
                      key={lawName}
                      title={tooltipText}
                      onClick={this.toggleLaws(lawName)}
                      className={`toggle-category-btn ${this.state.laws[lawName] ? "active" : ""}`}
                    >
                      {lawName.replace(/_/g, " ")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {this.state.errorMessage && (
          <div className="error-alert">{this.state.errorMessage}</div>
        )}
        <br />
        <div className="category-preference">
          <button
            onClick={this.toggleSupplyChain}
            className={`toggle-category-btn ${this.state.isSupplyChainOn ? "active" : ""}`}
          >
            {this.state.isSupplyChainOn
              ? "Analyse Supply Chain : ON"
              : "Analyse Supply Chain : OFF"}
          </button>
        </div>

        <div className="action-buttons">
          <button
            id="open-blank-editor-btn"
            onClick={this.onOpenBlankEditorButtonClick}
            disabled={this.state.loading}
          >
            Open Blank CORAS Model (Import / Test)
          </button>
          <button
            onClick={this.onGenerateSummaryButtonClick}
            disabled={this.state.loading}
          >
            Run assessment
          </button>
        </div>
      </div>
    );
  }

  renderSummary() {
    const isGeneratingSummary = this.state.loading && !this.state.summary;

    return (
      <div className="step-content">
        {this.statusMessage(
          isGeneratingSummary,
          this.state.summaryStatusMessage,
        )}
        {this.statusMessage(
          this.state.displaySummaryStatusMessage && !this.state.loading,
          this.state.summaryStatusMessage,
        )}

        {this.state.summary && (
          <>
            <p>Here is a structured description of the system: </p>
            <div className="generated-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {this.state.summary}
              </ReactMarkdown>
            </div>
            <p>Does this description accurately reflect your system?</p>
            <div className="action-buttons">
              <button onClick={this.onStartScope}>
                Yes, proceed to selection
              </button>
              <button
                id="summary-button-no"
                onClick={this.onSummaryAccurateNoButtonClick}
              >
                No
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  renderScopeSelection() {
    return (
      <div className="step-content">
        {this.statusMessage(
          this.state.loading &&
            !this.state.scopeData &&
            this.state.currentStep === 2,
          this.state.scopeStatusMessage,
        )}

        {this.state.scopeData && (
          <ScopeSelector
            scopeData={this.state.scopeData}
            onSubmitScope={this.onScopeValidated}
          />
        )}
      </div>
    );
  }

  renderAnalysis() {
    return (
      <div>
        {this.statusMessage(
          this.state.loading && !this.state.analysis,
          this.state.analysisStatusMessage,
        )}
        {this.state.techReport && (
          <>
            {this.state.isSwitchLegalPriorityOn ? (
              <>
                <p>Risk assessment:</p>
                <div>
                  <h1>Legal Analysis</h1>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {this.state.legalReport ||
                      "No legal reports have been generated."}
                  </ReactMarkdown>
                  <h1>Technical Analysis</h1>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {this.state.techReport ||
                      "No technical reports have been generated."}
                  </ReactMarkdown>
                  <hr />
                </div>
              </>
            ) : this.state.isSwitchLegalOn ? (
              <>
                <p>Risk assessment:</p>
                <div>
                  <h1>Technical Analysis</h1>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {this.state.techReport ||
                      "No technical reports have been generated."}
                  </ReactMarkdown>
                  <hr />
                  <h1>Legal Analysis</h1>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {this.state.legalReport ||
                      "No legal reports have been generated."}
                  </ReactMarkdown>
                </div>
              </>
            ) : (
              <>
                <p>Risk assessment:</p>
                <div>
                  <h1>Technical Analysis</h1>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {this.state.techReport ||
                      "No technical reports have been generated."}
                  </ReactMarkdown>
                </div>
              </>
            )}

            {/* <div className="action-buttons">
              <button onClick={this.onDisplayContextButtonClick}>
                {this.state.displayContext
                  ? "- Hide retrieved context"
                  : "+ Show retrieved context"}
              </button>
            </div>
            <pre className="generated-text">
              {this.state.displayContext ? this.state.retrievedContext : ""}
            </pre> */}
          </>
        )}
      </div>
    );
  }

  renderCorasModel() {
    return (
      <div className="render-coras-model">
        {this.statusMessage(this.state.loading, this.state.modelStatusMessage)}
        <div className="coras-model-container">
          <Editor ref={this.editorRef} />
        </div>
        {!this.state.loading && this.state.generatedModel && (
          <div className="action-buttons">
            <button onClick={this.fetchThreatModel}>
              Regenerate the model
            </button>
            <button onClick={this.generatePdfReport}>
              Download report of analysis
            </button>
          </div>
        )}
      </div>
    );
  }

  render() {
    const modelSuggestions = {
      ollama: [
        "qwen2.5:72b",
        "llama3.1:70b",
        "llama3.1:8b",
        "llama3:8b",
        "mistral:latest",
      ],
      openai: [
        "gpt-5.5",
        "gpt-5.4",
        "gpt-5.4-mini",
        "gpt-oss-120b",
        "gpt-oss-20b",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "gpt-3.5-turbo",
      ],
      groq: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "whisper-large-v3",
        "whisper-large-v3-turbo",
      ],
      custom_openai_compatible: [],
    };

    const currentSuggestions = modelSuggestions[this.state.llmProvider] || [];
    if (this.state.isBlankEditorMode) {
      return (
        <div id="coras-navigator">
          <div
            className={`container top-nav-container ${this.state.isNavVisible ? "nav-visible" : "nav-hidden"}`}
          >
            <h2 id="editor-title">Blank CORAS Editor</h2>
            <button
              id="back-to-workflow-btn"
              onClick={this.onBackToWorkflowButtonClick}
            >
              ← Back to Analysis Workflow
            </button>
          </div>
          <hr className="render-banner" />

          <div className="render-coras-model">{this.renderCorasModel()}</div>
        </div>
      );
    }
    return (
      <div id="coras-navigator">
        <div
          className={`container top-nav-container ${this.state.isNavVisible ? "nav-visible" : "nav-hidden"}`}
        >
          <div className="workflow-tabs-container">
            {this.state.workflowSteps.map((stepName, index) => {
              const isUnlocked = index <= this.state.unlockedStep;
              const isCurrent = index === this.state.currentStep;
              return (
                <button
                  key={index}
                  onClick={() => this.handleWorkflowStepClick(index)}
                  disabled={!isUnlocked}
                  className={`workflow-tab ${isCurrent ? "active" : ""} ${
                    !isUnlocked ? "locked" : ""
                  }`}
                >
                  {stepName}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="render-banner" />

        <div
          style={{ display: this.state.currentStep === 0 ? "block" : "none" }}
        >
          {this.renderContext()}
        </div>
        <div
          style={{ display: this.state.currentStep === 1 ? "block" : "none" }}
        >
          {this.renderSummary()}
        </div>
        <div
          style={{ display: this.state.currentStep === 2 ? "block" : "none" }}
        >
          {this.renderScopeSelection()}
        </div>
        <div
          style={{ display: this.state.currentStep === 3 ? "block" : "none" }}
        >
          {this.renderAnalysis()}
        </div>

        <div
          style={{
            position: this.state.currentStep === 4 ? "relative" : "absolute",
            visibility: this.state.currentStep === 4 ? "visible" : "hidden",
            left: this.state.currentStep === 4 ? "auto" : "-999px",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          {this.renderCorasModel()}
        </div>
        {this.state.showSettingsModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="setting-title">Configure AI Provider</h2>
              <p className="setting-text">
                Select your provider. Your API key remains in your browser
                memory and is securely proxied to the AI.
              </p>
              <p className="setting-text">
                ⚠️ Please choose a powerful model to ensure consistent results !
                ⚠️
              </p>

              <div className="input-group">
                <label>Provider</label>
                <select
                  name="llmProvider"
                  value={this.state.llmProvider}
                  onChange={this.handleLlmSettingChange}
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq</option>
                  <option value="custom_openai_compatible">
                    Custom / LMStudio / vLLM
                  </option>
                </select>
              </div>

              <div className="input-group">
                <label>Model Name</label>
                <input
                  type="text"
                  name="llmModel"
                  value={this.state.llmModel}
                  onChange={this.handleLlmSettingChange}
                  placeholder="e.g., gpt-4o, llama-3.3-70b-versatile, qwen2.5:72b"
                  list="model-suggestions"
                />

                <datalist id="model-suggestions">
                  {currentSuggestions.map((modelName) => (
                    <option key={modelName} value={modelName} />
                  ))}
                </datalist>
              </div>

              {this.state.llmProvider !== "ollama" && (
                <div className="input-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    name="llmApiKey"
                    value={this.state.llmApiKey}
                    onChange={this.handleLlmSettingChange}
                    placeholder="sk-..."
                    autoComplete="off"
                  />
                </div>
              )}

              <div className="save-and-close-btn">
                <button onClick={this.toggleSettingsModal}>Save & Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Navigator;
