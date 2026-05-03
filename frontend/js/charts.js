/**
 * VitalSync – Chart.js Vitals Trend Renderer
 */

// Render a multi-dataset line chart for vitals history
function renderVitalsChart(canvasId, vitalsData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !vitalsData || vitalsData.length === 0) return;

    // Reverse to show oldest → newest
    const data = [...vitalsData].reverse();

    const labels = data.map(v =>
        new Date(v.record_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    );

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if any
    if (window[`_chart_${canvasId}`]) window[`_chart_${canvasId}`].destroy();

    window[`_chart_${canvasId}`] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Heart Rate (bpm)',
                    data: data.map(v => v.heart_rate),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#ef4444',
                },
                {
                    label: 'Oxygen Level (%)',
                    data: data.map(v => v.oxygen_level),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34,197,94,.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#22c55e',
                },
                {
                    label: 'Temperature (°C)',
                    data: data.map(v => v.temperature),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245,158,11,.08)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#f59e0b',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } },
                },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}` } },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: '#94a3b8' },
                },
                y: {
                    grid: { color: 'rgba(0,0,0,.05)' },
                    ticks: { font: { size: 11 }, color: '#94a3b8' },
                },
            },
        },
    });
}

// Render a doughnut chart for appointment stats
function renderAppointmentChart(canvasId, stats) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window[`_chart_${canvasId}`]) window[`_chart_${canvasId}`].destroy();

    window[`_chart_${canvasId}`] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pending', 'Confirmed', 'Completed', 'Rejected'],
            datasets: [{
                data: [stats.pending, stats.confirmed, stats.completed, stats.rejected],
                backgroundColor: ['#fbbf24', '#34d399', '#60a5fa', '#f87171'],
                borderWidth: 0,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } },
            },
        },
    });
}

// Render a bar chart for medical budget tracker
function renderBudgetChart(canvasId, txs, bills, balance) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (window[`_chart_${canvasId}`]) window[`_chart_${canvasId}`].destroy();

    // Grouping transactions by month (last 6 months)
    const labels = [];
    const credits = [];
    const debits = [];

    const now = new Date();
    for(let i=5; i>=0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(d.toLocaleString('default', { month: 'short' }));
        credits.push(0);
        debits.push(0);
    }

    if (txs && txs.length > 0) {
        txs.forEach(tx => {
            const txDate = new Date(tx.transaction_date);
            const mDiff = (now.getFullYear() - txDate.getFullYear()) * 12 + now.getMonth() - txDate.getMonth();
            if (mDiff >= 0 && mDiff <= 5) {
                const idx = 5 - mDiff;
                if (tx.transaction_type === 'credit') {
                    credits[idx] += parseFloat(tx.amount);
                } else {
                    debits[idx] += parseFloat(tx.amount);
                }
            }
        });
    }

    window[`_chart_${canvasId}`] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Funds Added (₹)',
                    data: credits,
                    backgroundColor: '#34d399',
                    borderRadius: 4
                },
                {
                    label: 'Medical Expenses (₹)',
                    data: debits,
                    backgroundColor: '#f87171',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } }
            },
            scales: {
                x: { stacked: false, grid: { display: false } },
                y: { stacked: false, grid: { color: 'rgba(0,0,0,.05)' } }
            }
        }
    });
}
