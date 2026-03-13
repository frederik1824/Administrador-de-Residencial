export const exportToCSV = (data: any[], filename: string) => {
    if (!data || !data.length) {
        return;
    }

    // Attempt to extract headers from the first object
    const headers = Object.keys(data[0]);

    // Map each row to a CSV string
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add rows
    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + (row[header] ?? '')).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');

    // Create Blob and trigger download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
