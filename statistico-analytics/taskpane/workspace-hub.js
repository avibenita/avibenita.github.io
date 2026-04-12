/* global Office */
(function () {
  var CLUSTERS = [
    {
      id: "analytics",
      title: "Analytics",
      subtitle: "Statistical analysis modules for Excel workflows",
      icon: "fa-chart-line",
      color: "#f97316",
      url: "./hub.html"
    },
    {
      id: "calculators",
      title: "Calculators",
      subtitle: "Open calculator families and utility tools",
      icon: "fa-calculator",
      color: "#2563eb",
      url: "https://statistico.live/statistico-calculators/hub.html"
    },
    {
      id: "future-cluster",
      title: "More clusters",
      subtitle: "Reserved for additional app families",
      icon: "fa-cubes",
      color: "#64748b",
      comingSoon: true
    }
  ];

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openCluster(cluster) {
    if (!cluster || cluster.comingSoon || !cluster.url) return;
    window.location.href = cluster.url + (cluster.url.indexOf("?") >= 0 ? "&" : "?") + "fromWorkspace=1";
  }

  function renderClusters() {
    var holder = document.getElementById("clusterList");
    if (!holder) return;
    holder.innerHTML = CLUSTERS.map(function (cluster) {
      var safeTitle = escapeHtml(cluster.title);
      var safeSubtitle = escapeHtml(cluster.subtitle || "");
      var safeIcon = escapeHtml(cluster.icon || "fa-layer-group");
      var safeColor = escapeHtml(cluster.color || "#f97316");
      var extraClass = cluster.comingSoon ? " coming-soon" : "";
      var clickAttr = cluster.comingSoon ? "" : ' onclick="window.__openWorkspaceCluster(\'' + escapeHtml(cluster.id) + '\')"';
      return (
        '<div class="cluster-card' + extraClass + '" style="--cluster-color:' + safeColor + ';"' + clickAttr + ">" +
          '<div class="cluster-icon"><i class="fa-solid ' + safeIcon + '"></i></div>' +
          "<div>" +
            '<div class="cluster-title">' + safeTitle + "</div>" +
            '<div class="cluster-subtitle">' + safeSubtitle + "</div>" +
          "</div>" +
          (cluster.comingSoon ? '<span class="cluster-badge">Soon</span>' : '<i class="fa-solid fa-chevron-right cluster-arrow"></i>') +
        "</div>"
      );
    }).join("");
  }

  window.__openWorkspaceCluster = function (clusterId) {
    var cluster = CLUSTERS.find(function (item) { return item.id === clusterId; });
    openCluster(cluster);
  };

  Office.onReady(function () {
    renderClusters();
  });
})();
