#!/usr/bin/env python3
"""
Build dynamic project matrix for CI/CD workflow.

This script filters the project matrix based on workflow_dispatch inputs,
allowing selective builds of specific projects.
"""

import json
import os
import sys


def get_all_projects():
    """Define all available projects with their configurations."""
    return [
        {
            "projectName": "orchestration-api",
            "serverName": "orchestrator.internal.example.com",
            "dockerFile": "services/orchestration/Dockerfile",
            "working_directory": "services/orchestration",
            "deploy_to_environment": "staging",
            "DockerBuildArg": [
                "NODE_ENV=staging",
                "LOG_LEVEL=info"
            ],
            "secretsUser": "ORCHESTRATION_REGISTRY_USER",
            "secretsPass": "ORCHESTRATION_REGISTRY_PASSWORD",
            "enabled_flag": os.getenv("INPUT_PROJECT_ORCHESTRATION_API", "true")
        },
        {
            "projectName": "reporting-worker",
            "serverName": "worker.internal.example.com",
            "dockerFile": "services/reporting/Dockerfile",
            "working_directory": "services/reporting",
            "deploy_to_environment": "production",
            "DockerBuildArg": [
                "NODE_ENV=production",
                "ENABLE_BATCH=true"
            ],
            "secretsUser": "REPORTING_REGISTRY_USER",
            "secretsPass": "REPORTING_REGISTRY_PASSWORD",
            "enabled_flag": os.getenv("INPUT_PROJECT_REPORTING_WORKER", "true")
        }
    ]


def filter_projects(all_projects, event_name):
    """
    Filter projects based on event type and workflow inputs.

    Args:
        all_projects: List of all available projects
        event_name: GitHub event name (workflow_dispatch, push, pull_request)

    Returns:
        List of selected projects
    """
    if event_name == "workflow_dispatch":
        # Filter based on enabled flags from workflow inputs
        selected_projects = [p for p in all_projects if p["enabled_flag"] == "true"]
    else:
        # For push/PR events, include all projects
        selected_projects = all_projects

    # Remove the enabled_flag from the final output
    for project in selected_projects:
        project.pop("enabled_flag", None)

    return selected_projects


def write_github_output(matrix, has_projects):
    """
    Write outputs to GitHub Actions output file.

    Args:
        matrix: JSON string of the project matrix
        has_projects: Boolean string indicating if projects exist
    """
    github_output = os.getenv("GITHUB_OUTPUT")

    if not github_output:
        print("Error: GITHUB_OUTPUT environment variable not set", file=sys.stderr)
        sys.exit(1)

    with open(github_output, 'a') as f:
        f.write(f"matrix={matrix}\n")
        f.write(f"has_projects={has_projects}\n")


def main():
    """Main execution function."""
    # Get event name from environment
    event_name = os.getenv("EVENT_NAME", "push")

    # Get all projects and filter based on inputs
    all_projects = get_all_projects()
    selected_projects = filter_projects(all_projects, event_name)

    # Convert to JSON
    matrix_json = json.dumps(selected_projects)
    has_projects = "true" if len(selected_projects) > 0 else "false"

    # Write to GitHub output
    write_github_output(matrix_json, has_projects)

    # Print summary for workflow logs
    print(f"Event: {event_name}")
    print(f"Selected {len(selected_projects)} project(s)")
    print(f"Matrix: {matrix_json}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
