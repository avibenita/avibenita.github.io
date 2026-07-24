(function () {
  var TOPICS = [
    { title: "Overview", href: "1_Overview.htm#_Toc382426903" },
    { title: "Installation", href: "2_Installation.htm#_Toc382426904" },
    { title: "How does it work in Batch pasting?", href: "3_HowdoesitworkinBatchpasting.htm#node0" },
    { title: "How does it work in Selection pasting?", href: "4_HowdoesitworkinSelectionpasting.htm#node1" },
    { title: "Paste to predefined slides in PowerPoint", href: "5_PastetopredefinedslidesinPowerPoint.htm#_Toc382426907" },
    { title: "Slide positioning and sizing", href: "6_Slidepositioningandsizing.htm#_Toc382426908" },
    { title: "Create / Edit Named Tables", href: "7_CreateEditNamedTables.htm#_Toc382426909" },
    { title: "Inserting a title from EzPaste to slides", href: "8_InsertingatitlefromEzPastetoslides.htm#_Toc382426910" },
    { title: "Pasting to HTML or PDF", href: "9_PastingtoHTMLorPDF.htm#_Toc382426911" },
    { title: "Exporting to picture files", href: "10_Exportingtopicturefiles.htm#_Toc382426912" },
    { title: "Sending Excel items from Outlook", href: "11_SendingExcelitemsfromOutlook.htm#_Toc382426913" },
    { title: "Updating linked items", href: "12_Updatinglinkeditems.htm#node2" },
    { title: "EzPaste FAQ", href: "13_EzPaste-F.A.Qs.htm#_Toc382426914" }
  ];

  var frame;
  var topicLinks = [];
  var currentIndex = 0;
  var prevBtn;
  var nextBtn;

  function fileName(href) {
    return href.split("#")[0].toLowerCase();
  }

  function setActive(index) {
    currentIndex = index;
    topicLinks.forEach(function (link, i) {
      link.classList.toggle("is-active", i === index);
    });
    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= TOPICS.length - 1;
  }

  function loadTopic(index) {
    if (index < 0 || index >= TOPICS.length) return;
    setActive(index);
    frame.src = TOPICS[index].href;
  }

  function findIndexByHref(href) {
    var target = fileName(href || "");
    for (var i = 0; i < TOPICS.length; i++) {
      if (fileName(TOPICS[i].href) === target) return i;
    }
    return 0;
  }

  function filterTopics(query) {
    var q = (query || "").trim().toLowerCase();
    topicLinks.forEach(function (link, i) {
      var item = link.parentElement;
      var match = !q || TOPICS[i].title.toLowerCase().indexOf(q) >= 0;
      item.classList.toggle("hidden", !match);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var list = document.getElementById("helpTopics");
    frame = document.getElementById("helpFrame");
    prevBtn = document.getElementById("helpPrev");
    nextBtn = document.getElementById("helpNext");
    var search = document.getElementById("helpSearch");

    TOPICS.forEach(function (topic, index) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = topic.href;
      a.textContent = topic.title;
      a.addEventListener("click", function (event) {
        event.preventDefault();
        loadTopic(index);
      });
      li.appendChild(a);
      list.appendChild(li);
      topicLinks.push(a);
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        loadTopic(currentIndex - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        loadTopic(currentIndex + 1);
      });
    }

    if (search) {
      search.addEventListener("input", function () {
        filterTopics(search.value);
      });
    }

    var hash = window.location.hash.replace(/^#/, "");
    var start = hash ? findIndexByHref(hash) : 0;
    loadTopic(start);
  });
})();
