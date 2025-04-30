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
    const ordersPromises = ordersFiles.map(file => parseCSV(file));
    const deliveriesPromises = deliveriesFiles.map(file => parseCSV(file));

    Promise.all([Promise.all(ordersPromises), Promise.all(deliveriesPromises)]).then(([ordersData, deliveriesData]) => {
      ordersFull = ordersData.flat();
      deliveriesFull = deliveriesData.flat();
      cleanAndMatchData();
      showSummary();
      showVisualizations();
      hideLoading();
      alert('Files successfully processed!');
    });
  }

  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: function(results) {
          const raw = results.data;
          if (raw.length < 2) {
            reject(new Error('CSV missing header rows'));
            return;
          }
  
          const headers = raw[1];  // ONLY use second row (index 1) as headers
  
          const rows = raw.slice(2).filter(row => {
            return row.join('').trim() !== '' && !row.includes('TOTAL');
          });
  
          const formattedData = rows.map(row => {
            const obj = {};
            headers.forEach((header, idx) => {
              obj[header.trim()] = row[idx];
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
  

  function showSummary() {
    const totalOrders = ordersFull.length;
    const totalDeliveries = deliveriesFull.length;
  
    // Helper to trim and normalize
    function normalize(value) {
      return value ? value.toString().trim() : '';
    }
  
    // 1. Identify Orders without Deliveries
    const unmatchedOrders = ordersFull.filter(order => {
      const orderNo = normalize(order['No.']);
      return !deliveriesFull.some(delivery => normalize(delivery['PO nos.']) === orderNo);
    });
  
    // 2. Identify Deliveries without Orders
    const unmatchedDeliveries = deliveriesFull.filter(delivery => {
      const poNo = normalize(delivery['PO nos.']);
      return !ordersFull.some(order => normalize(order['No.']) === poNo);
    });
  
    // 3. Identify Orders with Multiple Deliveries
    const deliveryCount = {};
    deliveriesFull.forEach(delivery => {
      const poNo = normalize(delivery['PO nos.']);
      if (poNo) {
        deliveryCount[poNo] = (deliveryCount[poNo] || 0) + 1;
      }
    });
    const multipleDeliveries = Object.values(deliveryCount).filter(count => count > 1).length;
  
    // 4. Calculate percentages
    const percentOrdersWithoutDeliveries = ((unmatchedOrders.length / totalOrders) * 100).toFixed(2);
    const percentDeliveriesWithoutOrders = ((unmatchedDeliveries.length / totalDeliveries) * 100).toFixed(2);
  
    // 5. Show the Summary
    document.getElementById('summaryOutput').innerHTML = `
      <p><strong>Total Orders:</strong> ${totalOrders}</p>
      <p><strong>Total Deliveries:</strong> ${totalDeliveries}</p>
      <p><strong>Orders without Deliveries:</strong> ${unmatchedOrders.length}</p>
      <p><strong>Deliveries without Orders:</strong> ${unmatchedDeliveries.length}</p>
      <p><strong>Orders with Multiple Deliveries:</strong> ${multipleDeliveries}</p>
      <p><strong>Percent Orders without Deliveries:</strong> ${percentOrdersWithoutDeliveries}%</p>
      <p><strong>Percent Deliveries without Orders:</strong> ${percentDeliveriesWithoutOrders}%</p>
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
    const unmatchedOrders = matchedFull.filter(row => !row.Matched);
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
});
