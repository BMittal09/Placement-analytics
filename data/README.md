# Source Data

The data-processing pipeline expects a private Excel workbook named
`placement-stats.xlsx` in this directory by default.

The workbook itself is excluded from Git and must not be committed because it
may contain personally identifiable student information.

## Required worksheets

The workbook must contain:

- `Full Stats`
- `Internship`
- `Students List`

The `Students List` worksheet must include these columns:

- `Reg. No.`
- `Name`
- `CGPA`
- `Contact No.`
- `Email id`
- `Branch`
- `Company Name`
- `Offer Type`
- `CTC`
- `Stipend`

## Run the pipeline

From the repository root:

```powershell
.\.venv\Scripts\python.exe .\scripts\process.py
```
