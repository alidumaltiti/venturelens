/* app.js — logic for VentureLens feasibility calculator */

/* Utility helpers */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function formatCurrency(n) {
  if (n === "" || n == null) return "—";
  return new Intl.NumberFormat().format(Number(n));
}

// Page specific logic
document.addEventListener('DOMContentLoaded', () => {
    if (document.body.id === 'calculator-page') {
        checkAuth();
        initCalculator();
    }

    if (document.body.id === 'feedback-page') {
        initFeedback();
    }

    if (document.body.id === 'environment-page') {
        checkAuth();
        initEnvironmentCalculator();
    }

    if (document.body.id === 'signup-page') {
        initSignup();
    }

    if (document.body.id === 'login-page') {
        initLogin();
    }

    if (document.body.id === 'dashboard-page') {
        checkAuth();
        initDashboard();
    }
});

function checkAuth() {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    if (!loggedInUser) {
        window.location.href = 'login.html';
    }
}

function initSignup() {
    const signupForm = $("#signupForm");
    signupForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = $("#username").value;
        const password = $("#password").value;

        if (localStorage.getItem(username)) {
            alert("Username already exists. Please choose another one.");
            return;
        }

        localStorage.setItem(username, password);
        alert("Account created successfully! Please login.");
        window.location.href = "login.html";
    });
}

function initLogin() {
    const loginForm = $("#loginForm");
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = $("#username").value;
        const password = $("#password").value;

        if (localStorage.getItem(username) === password) {
            sessionStorage.setItem("loggedInUser", username);
            alert("Login successful!");
            window.location.href = "dashboard.html";
        } else {
            alert("Invalid username or password.");
        }
    });
}

function initDashboard() {
    const usernameDisplay = $("#username-display");
    const loggedInUser = sessionStorage.getItem("loggedInUser");
    usernameDisplay.textContent = loggedInUser;

    const logoutBtn = $("#logoutBtn");
    logoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("loggedInUser");
        window.location.href = "index.html";
    });

    const dashboardContent = $("#dashboard-content");
    const savedReports = JSON.parse(localStorage.getItem(loggedInUser + "_savedReports") || "[]");

    if (savedReports.length === 0) {
        dashboardContent.innerHTML = "<p>You have no saved reports yet. Go to the calculator to create one.</p>";
        return;
    }

    savedReports.forEach(report => {
        const reportElement = document.createElement("div");
        reportElement.classList.add("feature");
        reportElement.innerHTML = `
            <h3>${report.meta.name}</h3>
            <p><strong>Feasibility Score:</strong> ${report.score.final}%</p>
            <canvas id="chart-${report.meta.timestamp}" width="400" height="200"></canvas>
        `;
        dashboardContent.appendChild(reportElement);

        const ctx = document.getElementById(`chart-${report.meta.timestamp}`).getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Market", "Costs & Funding", "Competition & Differentiation", "Revenue & Profitability", "Team & Operations"],
                datasets: [{
                    label: 'Category Score',
                    data: [report.score.parts.marketScore, report.score.parts.costsScore, report.score.parts.competitionScore, report.score.parts.revenueScore, report.score.parts.teamScore],
                    backgroundColor: 'rgba(0, 123, 255, 0.6)'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    });
}

function initCalculator() {
    const sliders = [
      "marketDemand","marketReach","fundingAccess","competition","differentiation",
      "revenueStability","founderExp","opsReady"
    ];
    sliders.forEach(id=>{
      const el = document.getElementById(id);
      const out = document.getElementById(id + "Out");
      if(el && out){
        out.value = el.value;
        el.addEventListener('input', ()=> out.value = el.value);
      }
    });
    
    const calcForm = $("#calcForm");
    const calcNow = $("#calcNow");
    const saveLocal = $("#saveLocal");
    const resetBtn = $("#resetBtn");
    const scorePercent = $("#scorePercent");
    const verdictEl = $("#verdict");
    const breakeven = $("#breakeven");
    const breakdown = $("#breakdown");
    const recommendations = $("#recommendations");
    const resultShort = $("#resultShort");
    const printBtn = $("#printBtn");
    const downloadJson = $("#downloadJson");
    const downloadCsv = $("#downloadCsv");
    const shareLink = $("#shareLink");
    const downloadBusinessModel = $("#downloadBusinessModel");

    const tabs = $$(".tab-link");
    const tabContents = $$(".tab-content");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            tabContents.forEach(c => c.classList.remove("active"));
            $("#" + tab.dataset.tab).classList.add("active");
        });
    });

    function collectInputs(){
        const data = {
          bizName: $("#bizName").value.trim(),
          industry: $("#industry").value.trim(),
          stage: Number($("#stage").value),
          costMarketing: Number($("#costMarketing").value || 0),
          costSalaries: Number($("#costSalaries").value || 0),
          costEquipment: Number($("#costEquipment").value || 0),
          costOther: Number($("#costOther").value || 0),
          marketDemand: Number($("#marketDemand").value),
          marketReach: Number($("#marketReach").value),
          fundingAccess: Number($("#fundingAccess").value),
          competition: Number($("#competition").value),
          differentiation: Number($("#differentiation").value),
          monthlyRevenue: Number($("#monthlyRevenue").value || 0),
          monthlyCost: Number($("#monthlyCost").value || 0),
          revenueStability: Number($("#revenueStability").value),
          founderExp: Number($("#founderExp").value),
          opsReady: Number($("#opsReady").value),
          timestamp: new Date().toISOString()
        };
        data.initialCapital = data.costMarketing + data.costSalaries + data.costEquipment + data.costOther;
        return data;
      }
      
      function scale(v){ return Math.round(((v - 1) / 4) * 100); }
      
      function computeScore(data){
        const marketScore = Math.round((scale(data.marketDemand) * 0.6) + (scale(data.marketReach) * 0.4));
        const fundingScoreRaw = scale(data.fundingAccess);
        let capitalBurden = 100;
        if (data.initialCapital > 0){
          const monthsToRecover = data.monthlyRevenue > 0 ? data.initialCapital / data.monthlyRevenue : Infinity;
          if(!isFinite(monthsToRecover)) capitalBurden = 0;
          else {
            if(monthsToRecover <= 6) capitalBurden = 100;
            else if(monthsToRecover <= 12) capitalBurden = 70;
            else if(monthsToRecover <= 24) capitalBurden = 40;
            else capitalBurden = 15;
          }
        }
        const costsScore = Math.round((fundingScoreRaw * 0.6) + (capitalBurden * 0.4));
      
        const competitionScore = Math.round(((100 - scale(data.competition)) * 0.5) + (scale(data.differentiation) * 0.5));
      
        let marginScore = 50;
        if(data.monthlyRevenue > 0){
          const margin = Math.max(0, (data.monthlyRevenue - data.monthlyCost) / data.monthlyRevenue);
          marginScore = Math.round(Math.min(1, Math.max(0, margin)) * 100);
        } else {
          marginScore = 0;
        }
        const revenueScore = Math.round((marginScore * 0.65) + (scale(data.revenueStability) * 0.35));
      
        const teamScore = Math.round((scale(data.founderExp) * 0.6) + (scale(data.opsReady) * 0.4));
      
        const weights = {market:0.25, costs:0.15, competition:0.20, revenue:0.25, team:0.15};
        const final = Math.round(
          marketScore * weights.market +
          costsScore * weights.costs +
          competitionScore * weights.competition +
          revenueScore * weights.revenue +
          teamScore * weights.team
        );
      
        let breakevenMonths = "—";
        if(data.monthlyRevenue > data.monthlyCost){
          const monthlyProfit = data.monthlyRevenue - data.monthlyCost;
          if(monthlyProfit > 0 && data.initialCapital > 0){
            breakevenMonths = Math.ceil(data.initialCapital / monthlyProfit) + " mo";
          } else breakevenMonths = "Immediate";
        } else if (data.monthlyRevenue === 0) breakevenMonths = "Unknown";
        else breakevenMonths = "Not attainable (rev ≤ cost)";
      
        return {
          final,
          parts: {
            marketScore, costsScore, competitionScore, revenueScore, teamScore
          },
          breakeven: breakevenMonths
        };
      }

      function calculateInvestmentReadiness(data, scoreObj) {
        let readinessScore = 0;
        readinessScore += scoreObj.parts.marketScore * 0.3;
        readinessScore += scoreObj.parts.revenueScore * 0.3;
        readinessScore += scoreObj.parts.teamScore * 0.2;
        readinessScore += scoreObj.parts.competitionScore * 0.1;
        readinessScore += scoreObj.parts.costsScore * 0.1;
        readinessScore = Math.round(readinessScore);

        let recommendations = [];
        if (scoreObj.parts.marketScore < 60) recommendations.push("Strengthen market validation and show clear demand.");
        if (scoreObj.parts.revenueScore < 60) recommendations.push("Develop a clearer path to profitability.");
        if (scoreObj.parts.teamScore < 60) recommendations.push("Strengthen the team with experienced advisors or members.");
        if (data.initialCapital > 50000) recommendations.push("Consider a phased rollout to reduce initial capital needs.");

        return { score: readinessScore, recommendations };
      }

      function generateBusinessModel(data) {
        return `
          <h2>${data.bizName || 'Untitled'} - Business Model</h2>
          <h4>Industry: ${data.industry || 'Not specified'}</h4>

          <h3>1. Value Proposition</h3>
          <p>What unique value do you provide? Based on your differentiation score of ${data.differentiation}/5, your value proposition needs to be clearly defined.</p>

          <h3>2. Customer Segments</h3>
          <p>Who are your target customers? Your market reach score of ${data.marketReach}/5 suggests you have a plan to reach them.</p>

          <h3>3. Revenue Streams</h3>
          <p>How will you make money? You estimate a monthly revenue of ${formatCurrency(data.monthlyRevenue)} with a monthly cost of ${formatCurrency(data.monthlyCost)}.</p>

          <h3>4. Cost Structure</h3>
          <p>What are your major costs? Your initial capital is estimated at ${formatCurrency(data.initialCapital)}, broken down into:</p>
          <ul>
            <li>Marketing & Sales: ${formatCurrency(data.costMarketing)}</li>
            <li>Salaries & Fees: ${formatCurrency(data.costSalaries)}</li>
            <li>Equipment & Technology: ${formatCurrency(data.costEquipment)}</li>
            <li>Other: ${formatCurrency(data.costOther)}</li>
          </ul>

          <h3>5. Key Activities</h3>
          <p>What key activities do you need to perform? Your operational readiness score of ${data.opsReady}/5 indicates your preparedness.</p>
        `;
      }
      
      function generateRecommendations(parts){
        const rec = [];
        if(parts.marketScore < 50){
          rec.push("Investigate your target market more — validate demand with surveys or small pilots. Consider starting with a niche segment.");
        }
        if(parts.costsScore < 50){
          rec.push("Reduce upfront costs or secure better funding — explore grants, partnerships, or phased MVP that requires less capital.");
        }
        if(parts.competitionScore < 50){
          rec.push("Differentiate your offering. Clarify a unique value proposition or add services customers can't get elsewhere.");
        }
        if(parts.revenueScore < 50){
          rec.push("Improve margins: raise prices where justified, reduce operating costs, or pursue higher-value customers.");
        }
        if(parts.teamScore < 50){
          rec.push("Strengthen the team: co-founder with domain experience or hire part-time experts for key skills.");
        }
        if(rec.length === 0) rec.push("Great work — core areas look strong. Consider focusing on scale strategies, customer retention, and operational automation.");
        return rec;
      }
      
      function renderBreakdown(parts){
        breakdown.innerHTML = '<canvas id="breakdownChart"></canvas>';
        const ctx = document.getElementById('breakdownChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ["Market", "Costs & Funding", "Competition & Differentiation", "Revenue & Profitability", "Team & Operations"],
                datasets: [{
                    label: 'Category Score',
                    data: [parts.marketScore, parts.costsScore, parts.competitionScore, parts.revenueScore, parts.teamScore],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
      }
      
      function showResults(data, scoreObj){
        scorePercent.textContent = scoreObj.final;
        verdictEl.textContent = scoreObj.final >= 75 ? "High" : (scoreObj.final >= 50 ? "Medium" : "Low");
        breakeven.textContent = scoreObj.breakeven;
        resultShort.textContent = `Feasibility Score: ${scoreObj.final}% — ${verdictEl.textContent} viability.`;
        renderBreakdown(scoreObj.parts);
      
        const recs = generateRecommendations(scoreObj.parts);
        recommendations.innerHTML = `<h4>Recommendations</h4>` + recs.map(r=>`<p>• ${r}</p>`).join("");
      
        const radial = $("#radial");
        const degree = Math.min(100, Math.max(0, scoreObj.final));
        radial.style.background = `conic-gradient(var(--primary) 0% ${degree}%, #e9ecef ${degree}% 100%)`;

        // Investment Assessment
        const investmentAssessment = calculateInvestmentReadiness(data, scoreObj);
        const investmentContent = $("#investment-content");
        investmentContent.innerHTML = `
            <h4>Investor Readiness Score: ${investmentAssessment.score}%</h4>
            <p>This score estimates how attractive your project might be to investors.</p>
            <h5>Recommendations for Investors:</h5>
            <ul>
                ${investmentAssessment.recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
        `;

        // Business Model
        const businessModelContent = $("#business-model-content");
        businessModelContent.innerHTML = generateBusinessModel(data);
      }
      
      function createReport(data, scoreObj){
        return {
          meta: {
            name: data.bizName || "Untitled",
            industry: data.industry,
            stage: data.stage,
            timestamp: data.timestamp
          },
          inputs: data,
          score: scoreObj
        };
      }
      
      function downloadFile(filename, content, type="application/json"){
        const blob = new Blob([content], {type});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a);
        a.click(); a.remove(); URL.revokeObjectURL(url);
      }
      
      function reportToCsv(report){
        const rows = [];
        rows.push(["---REPORT METADATA---"]);
        for(const k in report.meta) rows.push([k, report.meta[k]]);
        rows.push([]);
        rows.push(["---INPUTS---"]);
        for(const k in report.inputs) rows.push([k, String(report.inputs[k])]);
        rows.push([]);
        rows.push(["---SCORES---"]);
        rows.push(["final", report.score.final]);
        for(const k in report.score.parts) rows.push([k, report.score.parts[k]]);
        rows.push(["breakeven", report.score.breakeven]);
        return rows.map(r=>r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
      }
      
      calcNow.addEventListener('click', ()=> {
        const data = collectInputs();
        const scoreObj = computeScore(data);
        const report = createReport(data, scoreObj);
        showResults(data, scoreObj);
        sessionStorage.setItem('lastReport', JSON.stringify(report));
      });
      
      saveLocal.addEventListener('click', ()=> {
        const loggedInUser = sessionStorage.getItem("loggedInUser");
        const data = collectInputs();
        const scoreObj = computeScore(data);
        const report = createReport(data, scoreObj);
        let saved = JSON.parse(localStorage.getItem(loggedInUser + "_savedReports") || "[]");
        saved.push(report);
        localStorage.setItem(loggedInUser + "_savedReports", JSON.stringify(saved));
        alert("Report saved to your dashboard.");
      });
      
      resetBtn.addEventListener('click', ()=> {
        if(!confirm("Reset the form?")) return;
        calcForm.reset();
        sliders.forEach(id => {
          const out = document.getElementById(id + "Out");
          const el = document.getElementById(id);
          if(out && el) { out.value = el.value = el.defaultValue || 3; }
        });
        resultShort.textContent = "Complete the form and press Calculate.";
        scorePercent.textContent = "--";
        verdictEl.textContent = "—";
        breakeven.textContent = "—";
        breakdown.innerHTML = "";
        recommendations.innerHTML = "";
        $("#bizName").focus();
      });
      
      printBtn.addEventListener('click', ()=> {
        const last = sessionStorage.getItem('lastReport');
        if(!last){ alert("Please calculate results first."); return; }
        const report = JSON.parse(last);
        const win = window.open("", "_blank", "width=800,height=800");
        const html = `
          <html><head><title>VentureLens - Report</title>
          <style>body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:20px} h1{color:#0b63b4}</style>
          </head><body>
          <h1>VentureLens — Assessment</h1>
          <p><strong>Idea:</strong> ${report.meta.name || "—"}</p>
          <p><strong>Industry:</strong> ${report.meta.industry || "—"}</p>
          <p><strong>Score:</strong> ${report.score.final}% — ${report.score.final >=75 ? "High": report.score.final>=50 ? "Medium":"Low"}</p>
          <h3>Category breakdown</h3>
          <ul>
            <li>Market: ${report.score.parts.marketScore}%</li>
            <li>Costs & Funding: ${report.score.parts.costsScore}%</li>
            <li>Competition & Differentiation: ${report.score.parts.competitionScore}%</li>
            <li>Revenue & Profitability: ${report.score.parts.revenueScore}%</li>
            <li>Team & Ops: ${report.score.parts.teamScore}%</li>
          </ul>
          <h3>Recommendations</h3>
          <ul>${generateRecommendations(report.score.parts).map(r=>`<li>${r}</li>`).join("")}</ul>
          <p><em>Generated on ${new Date(report.meta.timestamp).toLocaleString()}</em></p>
          <hr>
          <p>Generated by VentureLens (local browser app)</p>
          </body></html>`;
        win.document.write(html); win.document.close();
        win.document.documentElement.innerHTML = html;
      });
      
      downloadJson.addEventListener('click', ()=> {
        const last = sessionStorage.getItem('lastReport');
        if(!last){ alert("Please calculate results first."); return; }
        const report = JSON.parse(last);
        downloadFile(`${(report.meta.name||'venture')}_venturelens_report.json`, JSON.stringify(report, null, 2));
      });
      
      downloadCsv.addEventListener('click', ()=> {
        const last = sessionStorage.getItem('lastReport');
        if(!last){ alert("Please calculate results first."); return; }
        const report = JSON.parse(last);
        const csv = reportToCsv(report);
        downloadFile(`${(report.meta.name||'venture')}_venturelens_report.csv`, csv, "text/csv");
      });
      
      shareLink.addEventListener('click', async ()=>{
        const last = sessionStorage.getItem('lastReport');
        if(!last){ alert("Please calculate results first."); return; }
        const report = JSON.parse(last);
        const text = `VentureLens Report — ${report.meta.name || 'Untitled'} | Score: ${report.score.final}% (${report.score.final>=75?"High":report.score.final>=50?"Medium":"Low"}) — Market: ${report.score.parts.marketScore}% — Revenue: ${report.score.parts.revenueScore}%`;
        try{
          await navigator.clipboard.writeText(text);
          alert("Summary copied to clipboard.");
        }catch(e){ alert("Copy failed — here's the summary:\n" + text); }
      });

      downloadBusinessModel.addEventListener('click', () => {
        const data = collectInputs();
        const businessModelHtml = generateBusinessModel(data);
        downloadFile(`${(data.bizName||'venture')}_business_model.html`, businessModelHtml, 'text/html');
      });
}

function initFeedback() {
    const starContainer = $("#starContainer");
    const stars = $$("#starContainer .star");
    const fbSummary = $("#fbSummary");

    let selectedRating = 0;
    stars.forEach(btn => {
      btn.addEventListener('click', ()=>{
        selectedRating = Number(btn.dataset.value);
        stars.forEach(s => s.classList.toggle('active', Number(s.dataset.value) <= selectedRating));
      });
    });
    
    sendFeedback.addEventListener('click', ()=>{
      const name = $("#fbName").value.trim();
      const comment = $("#fbComment").value.trim();
      if(selectedRating === 0){
        alert("Please select a rating (1-5 stars)");
        return;
      }
      const item = {name, rating: selectedRating, comment, timestamp: new Date().toISOString()};
      const saved = JSON.parse(localStorage.getItem("venturelensFeedback") || "[]");
      saved.push(item);
      localStorage.setItem("venturelensFeedback", JSON.stringify(saved));
      $("#fbName").value = ""; $("#fbComment").value = "";
      selectedRating = 0; stars.forEach(s => s.classList.remove('active'));
      fbSummary.innerHTML = `<div class="thanks">Thanks for your feedback! We have ${saved.length} feedback entries stored locally.</div>`;
    });
    
    function loadFeedbackSummary(){
      const all = JSON.parse(localStorage.getItem("venturelensFeedback") || "[]");
      if(all.length === 0) return;
      const avg = Math.round(all.reduce((s,a)=>s+a.rating,0)/all.length);
      fbSummary.innerHTML = `<div><strong>Feedback summary:</strong> ${all.length} entries — avg rating ${avg} / 5</div>`;
    }
    loadFeedbackSummary();
}

function initEnvironmentCalculator() {
    const sliders = [
        "energyConsumption", "wasteGeneration", "waterUsage", "supplyChain", "productLifecycle"
    ];
    sliders.forEach(id => {
        const el = document.getElementById(id);
        const out = document.getElementById(id + "Out");
        if (el && out) {
            out.value = el.value;
            el.addEventListener('input', () => out.value = el.value);
        }
    });

    const calcEnvNow = $("#calcEnvNow");
    const resetEnvBtn = $("#resetEnvBtn");
    const envResultShort = $("#envResultShort");
    const envScorePercent = $("#envScorePercent");
    const envVerdict = $("#envVerdict");
    const envRecommendations = $("#envRecommendations");
    const envRadial = $("#envRadial");

    const resources = [
        { title: "The Future of the Responsible Company: What We've Learned from Patagonia's First 50 Years", url: "https://www.amazon.com/Future-Responsible-Company-Learned-Patagonias/dp/1954945153" },
        { title: "Net Positive: How Courageous Companies Thrive by Giving More Than They Take", url: "https://www.amazon.com/Net-Positive-Courageous-Companies-Thrive/dp/1647820655" },
        { title: "5 sustainability trends for 2025 and what they mean for startups", url: "https://www.eu-startups.com/2024/01/five-sustainability-trends-for-2025-and-what-they-mean-for-startups/" },
        { title: "Top 10 Sustainability Trends & Innovations (2025)", url: "https://www.startus-insights.com/innovators-guide/sustainability-trends/" }
    ];

    const resourceLinks = $("#resourceLinks");
    resourceLinks.innerHTML = resources.map(r => `<div class="feature"><a href="${r.url}" target="_blank"><h3>${r.title}</h3></a></div>`).join("");

    function calculateEnvScore() {
        const energyConsumption = Number($("#energyConsumption").value);
        const wasteGeneration = Number($("#wasteGeneration").value);
        const waterUsage = Number($("#waterUsage").value);
        const supplyChain = Number($("#supplyChain").value);
        const productLifecycle = Number($("#productLifecycle").value);

        const score = Math.round(((energyConsumption + wasteGeneration + waterUsage + supplyChain + productLifecycle) / 25) * 100);
        return score;
    }

    function generateEnvRecommendations(score) {
        const rec = [];
        if (score < 50) {
            rec.push("Focus on reducing energy consumption by using energy-efficient appliances and renewable energy sources.");
            rec.push("Implement a comprehensive waste reduction and recycling program.");
        } else if (score < 80) {
            rec.push("Optimize your supply chain for sustainability by working with local and eco-friendly suppliers.");
            rec.push("Design your products for a circular economy, making them easy to reuse, repair, or recycle.");
        } else {
            rec.push("Your business is already on a great path to sustainability. Look for innovative ways to become a leader in your industry.");
        }
        return rec;
    }

    calcEnvNow.addEventListener("click", () => {
        const score = calculateEnvScore();
        envScorePercent.textContent = score;
        const verdict = score >= 80 ? "Excellent" : (score >= 50 ? "Good" : "Needs Improvement");
        envVerdict.textContent = verdict;
        envResultShort.textContent = `Your business has a ${verdict} environmental score.`

        const recs = generateEnvRecommendations(score);
        envRecommendations.innerHTML = `<h4>Recommendations</h4>` + recs.map(r => `<p>• ${r}</p>`).join("");

        const degree = Math.min(100, Math.max(0, score));
        envRadial.style.background = `conic-gradient(var(--primary) 0% ${degree}%, #e9ecef ${degree}% 100%)`;
    });

    resetEnvBtn.addEventListener("click", () => {
        if (!confirm("Reset the form?")) return;
        $("#envForm").reset();
        sliders.forEach(id => {
            const out = document.getElementById(id + "Out");
            const el = document.getElementById(id);
            if (out && el) { out.value = el.value = el.defaultValue || 3; }
        });
        envResultShort.textContent = "Complete the form and press Calculate.";
        envScorePercent.textContent = "--";
        envVerdict.textContent = "—";
        envRecommendations.innerHTML = "";
    });
}
