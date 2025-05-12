# Cal Jamix Analysis Tool

This is a lightweight, browser-based tool designed to help non-technical users at UC Berkeley quickly analyze Jamix order and delivery data (no Python, Tableau, or advanced technical knowledge required).

## Why This Exists

Many members of our team don’t have experience with scripting or data visualization tools, making it hard to extract insights from Jamix data. This project automates core analyses, allowing anyone to:
- Upload raw order and delivery files (CSV or Excel)
- Automatically match records
- Flag unmatched or duplicate entries
- View charts and summaries at a glance
- Export cleaned datasets — no coding required

## Features

- Drag-and-drop file upload for Orders and Deliveries
- Automatic cleaning and matching of POs across datasets
- Summary statistics: unmatched orders/deliveries, duplicate POs, DSD exceptions, etc.
- Interactive visualizations: unmatched records by supplier/store/time
- One-click export of cleaned data in CSV or Excel format

## Who This Is For

This tool is built for:
- UC Berkeley operational staff
- Analysts who don't use Python/Tableau
- Teams working with the Jamix system and vendor reconciliation

## Supported Input Formats

- `.csv`, `.xls`, and `.xlsx` files
- Headers should appear on the **second row**, consistent with Jamix exports

## Try It Now

**Use the tool directly in your browser:**  
[https://sooyeon-k.github.io/cal-jamix-analysis/](https://sooyeon-k.github.io/cal-jamix-analysis/)

No installation required. Just open the link and upload your files.

## Export Options

- Matched dataset (merged orders & deliveries)
- Unmatched orders
- Unmatched deliveries (excluding DSD)
- Export as **CSV** or **Excel** via dropdown buttons

## Notes

- DSD suppliers (e.g., Pepsi, Wonder Ice Cream) are automatically excluded from unmatched delivery counts.
- The tool handles basic normalization (e.g., store name formatting) but may require updates as Jamix formats evolve.

## Built With

- HTML/CSS/JS (Vanilla)
- [PapaParse](https://www.papaparse.com/) – CSV parser
- [SheetJS (XLSX)](https://sheetjs.com/) – Excel read/write
- [Chart.js](https://www.chartjs.org/) – Visualization

---

Made with ❤ by Sooyeon Kim — empowering non-technical teams with data access.
