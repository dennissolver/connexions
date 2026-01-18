# Kira Tools for ElevenLabs

These JSON files contain the tool definitions for Kira's 9 tools.

## How to Use

1. Go to ElevenLabs → Conversational AI → Your Kira Agent → Tools
2. Click "Add tool"
3. Click "Edit as JSON" at the bottom
4. Paste the contents of each JSON file
5. Click "Add tool"
6. Repeat for all 9 tools
7. Click "Save" when done

## Tools Included

| File | Tool | Description |
|------|------|-------------|
| 01_list_panels.json | list_panels | Get all interview panels with stats |
| 02_get_panel.json | get_panel | Get details about a specific panel |
| 03_list_interviews.json | list_interviews | Get interviews with optional filters |
| 04_get_interview.json | get_interview | Get full transcript for an interview |
| 05_search_transcripts.json | search_transcripts | Search across all transcripts |
| 06_get_statistics.json | get_statistics | Get quantitative metrics |
| 07_get_themes.json | get_themes | Get aggregated themes and patterns |
| 08_recall_memory.json | recall_memory | Search Kira's memory |
| 09_save_memory.json | save_memory | Save insights for later |

## Webhook URL

All tools point to: `https://cx-3500-survey.vercel.app/api/kira/tools`

For other child platforms, replace `cx-3500-survey` with the appropriate domain.

## Note

The `tool_name` parameter is set as a constant value for each tool, which tells
the backend route which function to execute.
