

document.addEventListener('DOMContentLoaded', () => {
  let ordersFiles = [];
  let deliveriesFiles = [];
  let ordersFull = [];
  let deliveriesFull = [];
  let matchedFull = [];
  let finalCleanedData = [];

  document.getElementById('ordersInput').addEventListener('change', function(event) {
    ordersFiles = Array.from(event.target.files);
    checkBothUploaded();
  });

  document.getElementById('deliveriesInput').addEventListener('change', function(event) {
    deliveriesFiles = Array.from(event.target.files);
    checkBothUploaded();
  });

  function checkBothUploaded() {
    if (ordersFiles.length > 0 && deliveriesFiles.length > 0) {
      showLoading();
      setTimeout(() => {
        loadAndProcessFiles();
      }, 300);
    }
  }

  function loadAndProcessFiles() {
    const ordersPromises = ordersFiles.map(file => parseFile(file));
    const deliveriesPromises = deliveriesFiles.map(file => parseFile(file));    
    
    Promise.all([Promise.all(ordersPromises), Promise.all(deliveriesPromises)])
      .then(([ordersData, deliveriesData]) => {
        ordersFull = ordersData.flat();
        deliveriesFull = deliveriesData.flat();
        cleanAndMatchData();
        showSummary();
        showVisualizations();
        hideLoading();
        alert('Files successfully processed!');
      })
      .catch(err => {
        hideLoading();
        alert('Error processing files: ' + err.message);
        console.error(err);
      });
      
    }

  function parseFile(file) {
    return new Promise((resolve, reject) => {
      const extension = file.name.split('.').pop().toLowerCase();
  
      if (extension === 'csv') {
        Papa.parse(file, {
          complete: function(results) {
            const raw = results.data;
            if (raw.length < 2) {
              reject(new Error('CSV missing header rows'));
              return;
            }
  
            const headers = raw[1]; // Use second row as headers
            const rows = raw.slice(2).filter(row => {
              return row.join('').trim() !== '' && !row.includes('TOTAL');
            });
  
            const formattedData = rows.map(row => {
              const obj = {};
              headers.forEach((header, idx) => {
                obj[header?.toString().trim()] = row[idx];
              });
              return obj;
            });
  
            resolve(formattedData);
          },
          error: function(err) {
            reject(err);
          },
          header: false,
          skipEmptyLines: true,
          dynamicTyping: true
        });
      } else if (extension === 'xls' || extension === 'xlsx') {
        const reader = new FileReader();
        reader.onload = function(e) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
  
          const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          if (rawData.length < 2) {
            reject(new Error('Excel missing sufficient rows'));
            return;
          }
  
          const headers = rawData[1]; // Use second row as headers
          const dataRows = rawData.slice(2).filter(row => {
            return row.join('').trim() !== '' && !row.includes('TOTAL');
          });
  
          const formattedData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header?.toString().trim()] = row[idx];
            });
            return obj;
          });
  
          resolve(formattedData);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file format'));
      }
    });
  }
  

  function normalize(str) {
    return String(str || '').trim().toLowerCase();
  }
  
  function cleanAndMatchData() {
    // Normalize all keys
    ordersFull.forEach(row => {
      row['No.'] = normalize(row['No.']);
      row['Store'] = normalize(row['Store']);
      if (row['Store'] === 'clark kerr campus (ckc)') row['Store'] = 'clark kerr campus';
    });
  
    deliveriesFull.forEach(row => {
      row['PO nos.'] = normalize(row['PO nos.']);
      row['Store'] = normalize(row['Store']);
      if (row['Store'] === 'clark kerr campus (ckc)') row['Store'] = 'clark kerr campus';
    });
  
    // Match based on cleaned values
    matchedFull = ordersFull.map(order => {
      const matchingDelivery = deliveriesFull.find(delivery =>
        normalize(delivery['PO nos.']) === normalize(order['No.']) &&
        normalize(delivery['Store']) === normalize(order['Store'])
      );
  
      return {
        ...order,
        Matched: !!matchingDelivery,
        Delivery_No: matchingDelivery ? matchingDelivery['No.'] : null,
        Delivery_PO_nos: matchingDelivery ? matchingDelivery['PO nos.'] : null,
        Delivery_Store: matchingDelivery ? matchingDelivery['Store'] : null
      };
    });
  
    finalCleanedData = matchedFull;
  }

  function isDSDSupplier(supplier, store) {
    const normSupplier = normalize(supplier);
    const normStore = normalize(store);
  
    const dsdSuppliersList = [
      'pepperidge farms',
      'kikka sushi',
      'golden malted',
      'nuco2 llc',
      'wonder ice cream llc'
    ];
  
    const dsdPepsiStoresList = [
      'gbc', 'den', 'bear market', 'cub market', 'browns', 'cubby'
    ];
  
    const isPepsi = normSupplier.includes('pepsi');
    const isPepsiStore = dsdPepsiStoresList.includes(normStore);
  
    return dsdSuppliersList.some(dsd => normSupplier.includes(dsd)) || (isPepsi && isPepsiStore);
  }
  

  function showSummary() {
    const totalOrders = ordersFull.length;
    const totalDeliveries = deliveriesFull.length;
  
    const dsdSuppliers = [
      'pepperidge farms',
      'kikka',
      'golden malted',
      'nuco2 llc',
      'wonder ice cream llc',
      'pepsi bottling group inc'
    ];
  
    const pepsiStores = [
      'golden bear cafe', 'den', 'bear market', 'cub market', 'browns cafe', 'cubby'
    ];
  
    function normalize(value) {
      return value ? value.toString().trim().toLowerCase() : '';
    }
  
    // 1. Identify unmatched orders
    const unmatchedOrders = ordersFull.filter(order => {
      const orderNo = normalize(order['No.']);
      return !deliveriesFull.some(delivery => normalize(delivery['PO nos.']) === orderNo);
    });
  
    // 2. Identify unmatched deliveries
    const unmatchedDeliveriesRaw = deliveriesFull.filter(delivery => {
      const poNo = normalize(delivery['PO nos.']);
      return !ordersFull.some(order => normalize(order['No.']) === poNo);
    });
  
    // 3. Separate DSD unmatched deliveries
    const dsdUnmatchedDeliveries = unmatchedDeliveriesRaw.filter(delivery => {
      return isDSDSupplier(delivery['Supplier'], delivery['Store']);
    });
  
    // 4. Non-DSD unmatched deliveries
    const unmatchedDeliveries = unmatchedDeliveriesRaw.filter(delivery => {
      return !isDSDSupplier(delivery['Supplier'], delivery['Store']);
    });    
  
    // 5. Orders with multiple deliveries
    const deliveryCount = {};
    deliveriesFull.forEach(delivery => {
      const poNo = normalize(delivery['PO nos.']);
      if (poNo) {
        deliveryCount[poNo] = (deliveryCount[poNo] || 0) + 1;
      }
    });
    const multipleDeliveries = Object.values(deliveryCount).filter(count => count > 1).length;
  
    // 6. Percentages
    const percentOrdersWithoutDeliveries = ((unmatchedOrders.length / totalOrders) * 100).toFixed(2);
    const percentDeliveriesWithoutOrders = ((unmatchedDeliveries.length / totalDeliveries) * 100).toFixed(2);
  
    // 7. Show the Summary
    document.getElementById('summaryOutput').innerHTML = `
      <p><strong>Total Orders:</strong> ${totalOrders}</p>
      <p><strong>Total Deliveries:</strong> ${totalDeliveries}</p>
      <p><strong>Orders without Deliveries:</strong> ${unmatchedOrders.length}</p>
      <p><strong>Deliveries without Orders (excluding DSD):</strong> ${unmatchedDeliveries.length}</p>
      <p><strong>DSD Deliveries (excluded from match):</strong> ${dsdUnmatchedDeliveries.length}</p>
      <p><strong>Orders with Multiple Deliveries:</strong> ${multipleDeliveries}</p>
      <p><strong>Percent Orders without Deliveries:</strong> ${percentOrdersWithoutDeliveries}%</p>
      <p><strong>Percent Deliveries without Orders (excluding DSD):</strong> ${percentDeliveriesWithoutOrders}%</p>
    `;
  }
  
  function countByField(data, field) {
    const counts = {};
    data.forEach(row => {
      const key = row[field] || 'Unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

function showVisualizations() {
  const unmatchedOrders = matchedFull.filter(row => {
    return !row.Matched && !isDSDSupplier(row['Supplier'], row['Store']);
  });

  const unmatchedDeliveriesRaw = deliveriesFull.filter(delivery => {
    return !ordersFull.some(order =>
      normalize(order['No.']) === normalize(delivery['PO nos.'])
    );
  });

  const unmatchedDeliveries = unmatchedDeliveriesRaw.filter(delivery => {
    return !isDSDSupplier(delivery['Supplier'], delivery['Store']);
  });  

  const dsdDeliveries = unmatchedDeliveriesRaw.filter(delivery => {
    return isDSDSupplier(delivery['Supplier'], delivery['Store']);
  });

  // CHART 1: Unmatched Orders by Supplier
  const orderSupplierCounts = countByField(unmatchedOrders, 'Supplier');
  const topOrderSuppliers = Object.entries(orderSupplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ctx1 = document.getElementById('chartCanvas1').getContext('2d');
  if (window.chart1) window.chart1.destroy();
  window.chart1 = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: topOrderSuppliers.map(x => x[0]),
      datasets: [{
        label: 'Unmatched Orders by Supplier',
        data: topOrderSuppliers.map(x => x[1]),
        backgroundColor: 'rgba(255, 99, 132, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // CHART 2: Unmatched Orders by Store
  const orderStoreCounts = countByField(unmatchedOrders, 'Store');
  const topOrderStores = Object.entries(orderStoreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ctx2 = document.getElementById('chartCanvas2').getContext('2d');
  if (window.chart2) window.chart2.destroy();
  window.chart2 = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: topOrderStores.map(x => x[0]),
      datasets: [{
        label: 'Unmatched Orders by Store',
        data: topOrderStores.map(x => x[1]),
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // CHART 3: Unmatched Deliveries by Supplier (non-DSD)
  const deliverySupplierCounts = countByField(unmatchedDeliveries, 'Supplier');
  const topDeliverySuppliers = Object.entries(deliverySupplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ctx3 = document.getElementById('chartCanvas3').getContext('2d');
  if (window.chart3) window.chart3.destroy();
  window.chart3 = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: topDeliverySuppliers.map(x => x[0]),
      datasets: [{
        label: 'Unmatched Deliveries by Supplier',
        data: topDeliverySuppliers.map(x => x[1]),
        backgroundColor: 'rgba(255, 206, 86, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // CHART 4: Unmatched Deliveries by Store (non-DSD)
  const deliveryStoreCounts = countByField(unmatchedDeliveries, 'Store');
  const topDeliveryStores = Object.entries(deliveryStoreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const ctx4 = document.getElementById('chartCanvas4').getContext('2d');
  if (window.chart4) window.chart4.destroy();
  window.chart4 = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: topDeliveryStores.map(x => x[0]),
      datasets: [{
        label: 'Unmatched Deliveries by Store',
        data: topDeliveryStores.map(x => x[1]),
        backgroundColor: 'rgba(153, 102, 255, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // CHART 5: Unmatched Over Time
  function getMonthKey(rawValue) {
    if (!rawValue) return 'Unknown';
  
    let date;
  
    if (typeof rawValue === 'number') {
      // Excel serial number to JS Date
      date = new Date(Math.round((rawValue - 25569) * 86400 * 1000));
    } else {
      const parsed = new Date(rawValue);
      if (isNaN(parsed)) return 'Unknown';
      date = parsed;
    }
  
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  

  const orderDateCounts = {};
  unmatchedOrders.forEach(row => {
    const rawDate = row['Ordered'];
    const key = getMonthKey(rawDate);
    if (key !== 'Unknown') {
      orderDateCounts[key] = (orderDateCounts[key] || 0) + 1;
    }
  });

  const deliveryDateCounts = {};
  unmatchedDeliveries.forEach(row => {
    const rawDate = row['Delivery date'];
    const key = getMonthKey(rawDate);
    if (key !== 'Unknown') {
      deliveryDateCounts[key] = (deliveryDateCounts[key] || 0) + 1;
    }
  });

  const allMonths = Array.from(new Set([...Object.keys(orderDateCounts), ...Object.keys(deliveryDateCounts)])).sort();

  const ctx5 = document.getElementById('chartCanvas5').getContext('2d');
  if (window.chart5) window.chart5.destroy();
  window.chart5 = new Chart(ctx5, {
    type: 'line',
    data: {
      labels: allMonths,
      datasets: [
        {
          label: 'Unmatched Orders',
          data: allMonths.map(m => orderDateCounts[m] || 0),
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.3,
          fill: false
        },
        {
          label: 'Unmatched Deliveries',
          data: allMonths.map(m => deliveryDateCounts[m] || 0),
          borderColor: 'orange',
          backgroundColor: 'rgba(255, 165, 0, 0.2)',
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Unmatched Orders & Deliveries Over Time (Monthly)'
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Month' }
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Count' }
        }
      }
    }
  });

  // CHART 6: DSD Deliveries by Supplier
  const dsdSupplierCounts = countByField(dsdDeliveries, 'Supplier');
  const topDsdSuppliers = Object.entries(dsdSupplierCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const dsdCtx1 = document.getElementById('chartCanvas6').getContext('2d');
  if (window.chart6) window.chart6.destroy();
  window.chart6 = new Chart(dsdCtx1, {
    type: 'bar',
    data: {
      labels: topDsdSuppliers.map(x => x[0]),
      datasets: [{
        label: 'DSD Deliveries by Supplier',
        data: topDsdSuppliers.map(x => x[1]),
        backgroundColor: 'rgba(255, 159, 64, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });

  // CHART 7: DSD Deliveries by Store
  const dsdStoreCounts = countByField(dsdDeliveries, 'Store');
  const topDsdStores = Object.entries(dsdStoreCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const dsdCtx2 = document.getElementById('chartCanvas7').getContext('2d');
  if (window.chart7) window.chart7.destroy();
  window.chart7 = new Chart(dsdCtx2, {
    type: 'bar',
    data: {
      labels: topDsdStores.map(x => x[0]),
      datasets: [{
        label: 'DSD Deliveries by Store',
        data: topDsdStores.map(x => x[1]),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    },
    options: { scales: { y: { beginAtZero: true } } }
  });
}


  function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'block';
  }

  function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
  }

  window.downloadCleanedData = function() {
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
  };

  window.downloadOrdersData = function() {
    const csvRows = [];
    const headers = Object.keys(ordersFull[0]);
    csvRows.push(headers.join(','));

    for (const row of ordersFull) {
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
    a.setAttribute('download', 'cleaned_orders.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  window.downloadDeliveriesData = function() {
    const csvRows = [];
    const headers = Object.keys(deliveriesFull[0]);
    csvRows.push(headers.join(','));

    for (const row of deliveriesFull) {
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
    a.setAttribute('download', 'cleaned_deliveries.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  window.downloadData = function(type, asExcel = false) {
    let data, filename;
    if (type === 'merged') {
      data = finalCleanedData;
      filename = 'merged_orders_deliveries';
    } else if (type === 'unmatchedOrders') {
      data = matchedFull.filter(row => !row.Matched);
      filename = 'unmatched_orders';
    } else if (type === 'unmatchedDeliveries') {
      data = deliveriesFull.filter(delivery => {
        return !ordersFull.some(order =>
          normalize(order['No.']) === normalize(delivery['PO nos.'])
        );
      });
      filename = 'unmatched_deliveries';
    } else {
      alert('Invalid type for download.');
      return;
    }
  
    if (!data || data.length === 0) {
      alert('No data to export.');
      return;
    }
  
    if (asExcel) {
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
      XLSX.writeFile(workbook, filename + '.xlsx');
    } else {
      const csvRows = [];
      const headers = Object.keys(data[0]);
      csvRows.push(headers.join(','));
      for (const row of data) {
        const values = headers.map(header => `"${(row[header] || '').toString().replace(/"/g, '\\"')}"`);
        csvRows.push(values.join(','));
      }
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename + '.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

});
