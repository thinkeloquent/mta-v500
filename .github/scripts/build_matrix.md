You can now test the matrix builder locally:
export EVENT_NAME=workflow_dispatch
export INPUT_PROJECT_ORCHESTRATION_API=true
export INPUT_PROJECT_REPORTING_WORKER=false
export GITHUB_OUTPUT=/tmp/output.txt
python3 .github/scripts/build_matrix.py
cat /tmp/output.txt
