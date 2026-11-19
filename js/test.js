(function () {
  var params = new URLSearchParams(location.search);
  var test = TESTS.filter(function (t) { return t.id === params.get("id"); })[0];
  if (!test) { location.replace("index.html"); return; }

  var $ = function (id) { return document.getElementById(id); };
  var isTypes = test.mode === "types"; // types: 가장 많이 고른 유형이 결과 / 기본: 축 조합
  var labels = Object.assign({ strengths: "💪 강점", watch: "⚠️ 조심할 점", next: "👉 다음 한 걸음" }, test.labels || {});
  var answers = [];
  var idx = 0;

  document.title = test.title + " | " + SITE.name;
  document.documentElement.style.setProperty("--c", test.color); // 사진이 없을 때 보이는 배경색

  function show(id) {
    ["intro", "quiz", "result"].forEach(function (s) { $(s).classList.toggle("on", s === id); });
    window.scrollTo(0, 0);
  }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

  // 인트로
  $("i-emoji").textContent = test.emoji;
  $("i-title").textContent = test.title;
  $("i-sub").textContent = test.subtitle || test.desc;
  $("i-hook").textContent = (test.hook || [test.desc]).join("\n\n");
  $("i-meta").textContent = test.questions.length + "개의 질문을 통해, " + Object.keys(test.results).length +
    "개의 유형 중\n본인에게 가장 적합한 결과지를 받아보게 됩니다.";
  loadImage(testImage(test), function (src) {
    $("i-img").style.backgroundImage = "url(" + src + ")";
    $("i-img").classList.add("has-img");
  });
  $("start").onclick = function () { answers = []; idx = 0; show("quiz"); renderQ(); };

  // 질문
  function choicesFor(q) {
    if (isTypes) return q.options.map(function (o) { return { text: o.t, v: o.type }; });
    var pair = [{ text: q.a, v: "a" }, { text: q.b, v: "b" }];
    // 첫 번째 선택지만 고르는 쏠림을 줄이려고 일부 문항은 위아래를 바꿔 보여줌 (같은 문항은 항상 같은 순서)
    if ([1, 2].indexOf(idx % 4) !== -1) pair.reverse();
    return pair;
  }
  function renderQ() {
    var q = test.questions[idx];
    $("q").textContent = q.q;
    var box = $("choices");
    box.innerHTML = "";
    choicesFor(q).forEach(function (c) {
      var b = document.createElement("button");
      b.className = "choice";
      b.textContent = c.text;
      b.onclick = function () { pick(c.v); };
      box.appendChild(b);
    });
    $("count").textContent = (idx + 1) + " / " + test.questions.length;
    $("bar").style.width = (idx / test.questions.length * 100) + "%";
    $("back").style.visibility = idx === 0 ? "hidden" : "visible";
  }
  function pick(v) {
    answers[idx] = v;
    if (idx < test.questions.length - 1) { idx++; renderQ(); }
    else { finish(); }
  }
  $("back").onclick = function () { if (idx > 0) { idx--; renderQ(); } };

  // 점수 계산
  function score() {
    var tally = {}, code;
    if (isTypes) {
      var keys = Object.keys(test.results);
      keys.forEach(function (k) { tally[k] = 0; });
      answers.forEach(function (t) { if (tally[t] !== undefined) tally[t]++; });
      code = keys.reduce(function (best, k) { return tally[k] > tally[best] ? k : best; }, keys[0]); // 동점이면 앞 유형
    } else {
      test.axes.forEach(function (ax) { tally[ax.key] = { a: 0, b: 0 }; });
      test.questions.forEach(function (q, i) { if (answers[i]) tally[q.axis][answers[i]]++; });
      // 기준별로 더 많이 고른 쪽. 동점이면 그 기준의 마지막 질문에서 고른 쪽을 따름
      code = test.axes.map(function (ax) {
        var t = tally[ax.key];
        if (t.a !== t.b) return t.a > t.b ? ax.a : ax.b;
        for (var i = test.questions.length - 1; i >= 0; i--) {
          if (test.questions[i].axis === ax.key && answers[i]) return answers[i] === "a" ? ax.a : ax.b;
        }
        return ax.a;
      }).join("");
    }
    return { code: code, tally: tally };
  }
  function finish() {
    var s = score();
    history.replaceState(null, "", "?id=" + test.id + "&r=" + s.code);
    renderResult(s.code, s.tally);
  }

  function bars(tally, code) {
    if (!tally) return "";
    var html;
    if (isTypes) {
      var total = answers.length || 1;
      html = Object.keys(test.results).map(function (k) {
        var p = Math.round(tally[k] / total * 100);
        return '<div class="axis"><div class="names"><span class="' + (tally[k] === Math.max.apply(null, Object.keys(tally).map(function (x) { return tally[x]; })) ? "win" : "") + '">' +
          esc(test.results[k].name) + '</span><span>' + p + '%</span></div><div class="bar"><i style="width:' + p + '%"></i></div></div>';
      }).join("");
    } else {
      html = test.axes.map(function (ax, i) {
        var t = tally[ax.key], total = t.a + t.b, pa = Math.round(t.a / total * 100);
        var aWins = code.charAt(i) === ax.a; // 동점일 때도 실제 결과 글자와 강조가 일치하도록 결과 코드 기준
        return '<div class="axis"><div class="names"><span class="' + (aWins ? "win" : "") + '">' +
          esc(ax.aName) + " " + pa + '%</span><span class="' + (!aWins ? "win" : "") + '">' +
          esc(ax.bName) + " " + (100 - pa) + '%</span></div><div class="bar"><i style="width:' + pa + '%"></i></div></div>';
      }).join("");
    }
    return '<div class="axes">' + html + "</div>";
  }

  function list(arr) { return "<ul>" + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }

  function renderResult(code, tally) {
    var r = test.results[code];
    if (!r) { show("intro"); return; }
    var kicker = (test.kicker || "나의 유형") + (test.showCode ? " · " + code : "");
    var m = r.match;
    $("result").innerHTML =
      '<div class="emoji">' + r.emoji + '</div>' +
      '<div class="kicker">' + esc(kicker) + '</div>' +
      '<h1>' + esc(r.name) + '</h1>' +
      '<p class="tag">' + esc(r.tagline) + '</p>' +
      '<div class="box"><p>' + esc(r.desc) + '</p></div>' + bars(tally, code) +
      '<div class="box"><h3>' + labels.strengths + '</h3>' + list(r.strengths) + '</div>' +
      '<div class="box"><h3>' + labels.watch + '</h3>' + list(r.watch) + '</div>' +
      '<div class="box"><h3>' + labels.next + '</h3><p>' + esc(r.next) + '</p></div>' +
      (m ? '<div class="box"><h3>🤝 잘 맞는 파트너</h3><p><b>' + esc(m.goodName) + '</b><br>' + esc(m.tip) + '</p></div>' : "") +
      '<div class="actions">' +
      '<button class="btn" id="share">결과 공유하기</button>' +
      '<button class="btn ghost" id="retry">다시 테스트하기</button>' +
      '<a class="btn ghost" href="index.html">다른 테스트 보기</a></div>';
    $("share").onclick = share;
    $("retry").onclick = function () {
      history.replaceState(null, "", "?id=" + test.id);
      answers = []; idx = 0; show("intro");
    };
    show("result");
  }

  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("on");
    setTimeout(function () { t.classList.remove("on"); }, 1800);
  }
  function share() {
    var url = location.href;
    if (navigator.share) {
      navigator.share({ title: test.title, text: test.title, url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () { toast("링크를 복사했어요"); });
    } else { prompt("링크를 복사하세요", url); }
  }

  // 결과 링크로 바로 들어온 경우
  var r = params.get("r");
  if (r && test.results[r]) renderResult(r, null);
  else show("intro");
})();
