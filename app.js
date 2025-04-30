let ordersFiles = [];
let deliveriesFiles = [];
let ordersFull = [];
let deliveriesFull = [];
let matchedFull = [];
let finalCleanedData = [];

// Handle Orders upload
document.getElementById('ordersInput').addEventListener('change', function(event) {
  ordersFiles = Array.from(event.target.files);
  checkBothUploaded();
});

document.getElementById('deliveriesInput').addEventListener('change', function(event) {
  deliveriesFiles = Array.from(event.target.files);
  checkBothUploaded();
});

// Check if both uploaded
function checkBothUploaded() {
  if (ordersFiles.length > 0 && deliveriesFiles.length > 0) {
    showLoading();
    setTimeout(() => { // slight delay so spinner shows nicely
      loadAndProcessFiles();
    }, 300);
  }
}

// Load and process orders + deliveries
function loadAndProcessFiles() {
  const ordersPromises = ordersFiles.map(file => parseCSV(file));
  const deliveriesPromises = deliveriesFiles.map(file => parseCSV(file));

  Promise.all([Promise.all(ordersPromises), Promise.all(deliveriesPromises)]).then(([ordersData, deliveriesData]) => {
    ordersFull = ordersData.flat();
    deliveriesFull = deliveriesData.flat();
    cleanAndMatchData();
    showSummary();
    showVisualizations();
    hideLoading();
    alert('✅ Files successfully processed!');
  });
}

// CSV parser
function parseCSV(file) {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: false,
      dynamicTyping: true,
      complete: function(results) {
        const df = results.data;
        const headers = df[0];
        const data = df.slice(1);
        const formattedData = data.map(row => {
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header ? header.toString().trim() : `Column${idx}`] = row[idx];
          });
          return obj;
        });
        resolve(formattedData);
      }
    });
  });
}

// Clean and match
function cleanAndMatchData() {
  ordersFull.forEach(row => {
    row['No.'] = row['No.'] ? String(row['No.']).trim() : '';
    row['Store'] = row['Store'] ? String(row['Store']).trim() : '';
    if (row['Store'] === 'Clark Kerr Campus (CKC)') row['Store'] = 'Clark Kerr Campus';
  });

  deliveriesFull.forEach(row => {
    row['PO nos.'] = row['PO nos.'] ? String(row['PO nos.']).trim() : '';
    row['Store'] = row['Store'] ? String(row['Store']).trim() : '';
    if (row['Store'] === 'Clark Kerr Campus (CKC)') row['Store'] = 'Clark Kerr Campus';
  });

  matchedFull = ordersFull.map(order => {
    const match = deliveriesFull.find(delivery =>
      delivery['PO nos.'] === order['No.'] && delivery['Store'] === order['Store']
    );

    if (match) {
      return { ...order, ...match, Matched: true };
    } else {
      return { ...order, 'PO nos.': null, Matched: false };
    }
  });

  finalCleanedData = matchedFull;
}

// Create summary
function showSummary() {
  const totalOrders = ordersFull.length;
  const totalDeliveries = deliveriesFull.length;

  const unmatchedOrders = matchedFull.filter(row => row.Matched === false);

  const unmatchedDeliveries = deliveriesFull.filter(delivery => {
    return !ordersFull.some(order =>
      order['No.'] === delivery['PO nos.'] && order['Store'] === delivery['Store']
    );
  });

  const multipleDeliveries = countMultipleDeliveries();

  const summaryHtml = `
    <p><strong>Total Orders:</strong> ${totalOrders}</p>
    <p><strong>Total Deliveries:</strong> ${totalDeliveries}</p>
    <p><strong>Orders without Deliveries:</strong> ${unmatchedOrders.length}</p>
    <p><strong>Deliveries without Orders:</strong> ${unmatchedDeliveries.length}</p>
    <p><strong>Orders with Multiple Deliveries:</strong> ${multipleDeliveries}</p>
  `;

  document.getElementById('summaryOutput').innerHTML = summaryHtml;
}

// Count orders with multiple deliveries
function countMultipleDeliveries() {
  const counts = {};
  matchedFull.forEach(row => {
    const orderNo = row['No.'];
    if (orderNo) {
      counts[orderNo] = (counts[orderNo] || 0) + 1;
    }
  });
  return Object.values(counts).filter(count => count > 1).length;
}

// Visualizations
function showVisualizations() {
  const unmatchedOrders = matchedFull.filter(row => row.Matched === false);

  const supplierCounts = countByField(unmatchedOrders, 'Supplier');
  const topSuppliers = Object.entries(supplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const ctx1 = document.getElementById('chartCanvas1').getContext('2d');
  if (window.chart1) window.chart1.destroy();
  window.chart1 = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: topSuppliers.map(x => x[0]),
      datasets: [{
        label: 'Unmatched Orders by Supplier',
        data: topSuppliers.map(x => x[1]),
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  const storeCounts = countByField(unmatchedOrders, 'Store');
  const topStores = Object.entries(storeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const ctx2 = document.getElementById('chartCanvas2').getContext('2d');
  if (window.chart2) window.chart2.destroy();
  window.chart2 = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: topStores.map(x => x[0]),
      datasets: [{
        label: 'Unmatched Orders by Store',
        data: topStores.map(x => x[1]),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}

// Helper: count field values
function countByField(data, field) {
  const counts = {};
  data.forEach(row => {
    const key = row[field] || 'Unknown';
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

// Download cleaned file
function downloadCleanedData() {
  const csvRows = [];
  const headers = Object.keys(finalCleanedData[0]);
  csvRows.push(headers.join(','));

  for (const row of finalCleanedData) {
    const values = headers.map(header => {
      const escaped = ('' + (row[header] || '')).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'matched_orders_deliveries_clean.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Loading spinner
function showLoading() {
  document.getElementById('loadingSpinner').style.display = 'block';
}

function hideLoading() {
  document.getElementById('loadingSpinner').style.display = 'none';
}
