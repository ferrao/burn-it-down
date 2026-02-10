# Burn It Down

A command-line tool for generating burndown charts from project data. Visualize your sprint progress with an ideal burndown line compared to actual task completion.

## Features

- Generate PNG burndown charts from JSON project data
- Compare ideal progress against actual task completion
- Support for milestones and multiple sprints
- Can be used standalone or as an opencode tool
- Clean, professional chart output with Chart.js

## Installation

```bash
npm install
```

## Usage

### Command Line

Generate a chart from a JSON data file:

```bash
node plot.mjs data.json [output.png]
```

If no output path is provided, the chart will be saved as `chart.png` in the current directory.

### As an Opencode Tool

To use this as an opencode tool, copy all files from the `opencode` directory to `~/.config/opencode`:

```bash
cp -r opencode/* ~/.config/opencode/
```

Once installed:
- The `burn-down-chart` tool will be automatically loaded by opencode
- The context documentation at `opencode/context/burn-it-down.md` can be referenced by opencode agents and commands
- Agents can use the tool to generate burndown charts from project plan data

The tool accepts two arguments:
- `filePath`: Path to the JSON file with project data
- `imagePath`: Path where the PNG chart will be saved

## Data Format

The input JSON file must contain the following structure:

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `startDate` | string | Project start date in `YYYY-MM-DD` format |
| `milestones` | array | Array of milestone objects |
| `tasks` | array | Array of task objects |

### Milestone Object

Each milestone must have:
- `id` (string): Unique identifier (e.g., "MS-001")
- `name` (string): Short label for chart display (e.g., "MS1")
- `date` (string): End date of the milestone in `YYYY-MM-DD` format

### Task Object

Each task must have:
- `id` (string): Unique identifier
- `points` (number): Story points or hours representing effort
- `completedAt` (string or null): Completion date in `YYYY-MM-DD` format, or `null` for incomplete tasks

## Example Data

```json
{
  "startDate": "2023-10-01",
  "milestones": [
    { "id": "m1", "name": "MS1", "date": "2023-10-13" },
    { "id": "m2", "name": "MS2", "date": "2023-10-27" }
  ],
  "tasks": [
    { "id": "t1", "points": 5, "completedAt": "2023-10-05" },
    { "id": "t2", "points": 8, "completedAt": null }
  ]
}
```

## Chart Output

The generated chart displays:
- **Blue line**: Ideal burndown (linear progression from total scope to zero)
- **Red line**: Actual progress based on task completion dates
- **X-axis**: Timeline in days from project start
- **Y-axis**: Remaining effort (points)
- **Milestone labels**: Displayed below the x-axis
