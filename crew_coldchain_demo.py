"""
ColdChain-Twin — Multi-Agent Facility Operations Crew
Powered by CrewAI (v1.15.28)
"""

import os
import sys
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM

# ---------------------------------------------------------------------------
# Configuration & Environment Variables
# ---------------------------------------------------------------------------
load_dotenv()

# CrewAI tracing configuration
TRACING_ENABLED = os.environ.get("CREWAI_TRACING_ENABLED", "true").lower() == "true"
os.environ["CREWAI_TRACING_ENABLED"] = "true" if TRACING_ENABLED else "false"

# Model and API Key configuration (configured via .env or environment)
MODEL_NAME = os.environ.get("GEMINI_MODEL") or os.environ.get("OPENAI_MODEL_NAME") or "gemini/gemini-3.1-flash-lite"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError(
        "Missing GEMINI_API_KEY! Please set GEMINI_API_KEY in your .env file or environment."
    )

# Off-peak hours and maintenance ticket configuration
OFFPEAK_WINDOW = os.environ.get("OFFPEAK_WINDOW", "02:00-05:00")
DEFAULT_TICKET_ID = os.environ.get("DEFAULT_TICKET_ID", "CC-2047")

# Default facility incident report (can be overridden via environment or function call)
DEFAULT_INCIDENT_REPORT = os.environ.get(
    "FACILITY_INCIDENT_REPORT",
    """FACILITY INCIDENT REPORT [Facility ND-04 / Bay 3]:
- Exterior Ambient Temperature: +32.0°C (High peak-heat condition)
- Bay 3 Loading Door Status: Open for 42 seconds (Operational Threshold is 20s)
- Airflow: Aisle 2 pallet obstruction causing 15% circulation reduction
- Zone A Temperature: Warming from -20.0°C baseline to -17.2°C
- Compressor 2 (CMP-02): Operating at 18% over thermal baseline (Runaway cycle risk within 35 mins)
- Current Total Power Draw: 312 kW (Normal baseline: 248 kW)"""
)

# Initialize LLM dynamically
gemini_llm = LLM(
    model=MODEL_NAME,
    api_key=GEMINI_API_KEY
)

def run_coldchain_crew(incident_report: str = None, ticket_id: str = None, offpeak_window: str = None):
    """
    Executes the ColdChain-Twin autonomous multi-agent crew.
    All parameters are dynamically configurable.
    """
    report = incident_report or DEFAULT_INCIDENT_REPORT
    ticket = ticket_id or DEFAULT_TICKET_ID
    offpeak = offpeak_window or OFFPEAK_WINDOW

    # 1. Define Specialized Autonomous Agents
    telemetry_analyst = Agent(
        role="Cold Storage Telemetry & Anomaly Specialist",
        goal="Identify runaway thermal load, excessive door-open events, and compressor strain from facility sensors",
        backstory=(
            "You are an industrial engineer specializing in HVAC and large-scale refrigerated warehouse thermodynamics. "
            "You analyze real-time Pt100 RTD sensor logs, power meters (kW), and CV dock door events."
        ),
        llm=gemini_llm,
        verbose=True,
    )

    maintenance_lead = Agent(
        role="Refrigeration Maintenance Supervisor",
        goal="Generate structured, actionable repair tickets for equipment failure and thermal seal degradation",
        backstory=(
            "With 20 years in industrial refrigeration, you diagnose mechanical faults, prioritize urgent repairs, "
            "and calculate technician response windows before product spoilage occurs."
        ),
        llm=gemini_llm,
        verbose=True,
    )

    esg_auditor = Agent(
        role="Facility Energy & Carbon Auditor",
        goal="Calculate kWh saved, off-peak tariff cost reduction, and carbon footprint mitigation for ESG audits",
        backstory=(
            "You specialize in ISO 50001 energy management and corporate ESG reporting, translating operational changes "
            "into kilowatt-hour savings and avoided metric tonnes of CO2."
        ),
        llm=gemini_llm,
        verbose=True,
    )

    # 2. Define Dynamic Tasks
    t1_analysis = Task(
        description=f"Analyze the following facility telemetry incident:\n{report}\n"
                    "Identify the primary source of thermal shock and quantify compressor runaway risk.",
        expected_output="Thermal shock assessment and equipment vulnerability report.",
        agent=telemetry_analyst,
    )

    t2_maintenance = Task(
        description=f"Based on the anomaly assessment, draft an Urgent Maintenance Ticket (Ticket {ticket}). "
                    "Include: Emergency containment actions, replacement parts (e.g. silicone flap seal), "
                    "and technician response window.",
        expected_output="Structured Maintenance Ticket with priority level, root cause, and immediate checklist.",
        agent=maintenance_lead,
    )

    t3_esg_optimization = Task(
        description=f"Formulate an energy mitigation plan: shift blast precooling to off-peak night hours ({offpeak}) "
                    "and compute projected daily kWh savings, bill reduction (in INR and USD), and CO2 avoided.",
        expected_output="Off-peak precooling schedule and ESG financial/carbon audit summary.",
        agent=esg_auditor,
    )

    # 3. Assemble and Run the Crew
    facility_crew = Crew(
        agents=[telemetry_analyst, maintenance_lead, esg_auditor],
        tasks=[t1_analysis, t2_maintenance, t3_esg_optimization],
        process=Process.sequential,
        verbose=True,
        tracing=TRACING_ENABLED,
    )

    print("\n--- Starting ColdChain-Twin Autonomous Operations Crew ---")
    result = facility_crew.kickoff()
    print("\n================ FINAL REPORT ================")
    print(result)
    return result

if __name__ == "__main__":
    run_coldchain_crew()
