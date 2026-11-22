(function () {
  var params = new URLSearchParams(location.search);
  var test = TESTS.filter(function (t) { return t.id === params.get("id"); })[0];
  if (!test) { location.replace("index.html"); return; }

  var $ = function (id) { return document.getElementById(id); };
  var isTypes = test.mode === "types"; // types: 가장 많이 고른 유형이 결과 / 기본: 축 조합
  var labels = Object.assign({ strengths: "💪 강점", watch: "⚠️ 조심할 점", next: "👉 다음 한 걸음" }, test.labels || {});
  var answers = [];
  var idx = 0;
  var locked = false;   // 선택 효과가 재생되는 동안 중복 클릭을 막음
  var shownCode = null; // 지금 보여주는 결과 코드 (공유에 사용)

  document.title = test.title + " | " + SITE.name;
  document.documentElement.style.setProperty("--c", test.color); // 사진이 없을 때 보이는 배경색

  function show(id) {
    ["intro", "quiz", "result"].forEach(function (s) { $(s).classList.toggle("on", s === id); });
    window.scrollTo(0, 0);
  }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }
  // 글을 양끝 정렬로 보여주려고, 문단 안의 줄바꿈은 공백으로 바꾸고 빈 줄(문단 나눔)만 남김
  function soft(t) { return t.split(/\n\s*\n/).map(function (s) { return s.replace(/\n/g, " "); }).join("\n\n"); }

  // 인트로
  $("i-emoji").textContent = test.emoji;
  $("i-title").textContent = test.title;
  $("i-sub").textContent = test.subtitle || test.desc;
  $("i-hook").textContent = (test.hook || [test.desc]).map(soft).join("\n\n");
  $("i-meta").textContent = test.questions.length + "개의 질문을 통해, " + Object.keys(test.results).length +
    "개의 유형 중 본인에게 가장 적합한 결과지를 받아보게 됩니다.";
  loadImage(testImage(test), function (src) {
    $("i-img").style.backgroundImage = "url(" + src + ")";
    $("i-img").classList.add("has-img");
  });
  $("start").onclick = function () { answers = []; idx = 0; locked = false; show("quiz"); renderQ(); };

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
    var qEl = $("q");
    qEl.textContent = q.q;
    qEl.classList.remove("in"); void qEl.offsetWidth; qEl.classList.add("in"); // 질문이 바뀔 때마다 등장 효과를 다시 재생
    var box = $("choices");
    box.innerHTML = "";
    box.classList.remove("locked");
    locked = false;
    choicesFor(q).forEach(function (c) {
      var b = document.createElement("button");
      b.className = "choice";
      b.textContent = c.text;
      b.onclick = function () {
        if (locked) return;
        locked = true;
        b.classList.add("picked");      // 고른 선택지를 눌린 색으로 강조하고
        box.classList.add("locked");    // 나머지는 흐리게
        setTimeout(function () { pick(c.v); }, 190); // 잠깐 보여준 뒤 다음 질문으로
      };
      box.appendChild(b);
    });
    $("count").textContent = (idx + 1) + " / " + test.questions.length;
    $("bar").style.width = (idx / test.questions.length * 100) + "%";
    $("back").style.visibility = idx === 0 ? "hidden" : "visible";
  }
  function pick(v) {
    answers[idx] = v;
    if (idx < test.questions.length - 1) { idx++; renderQ(); }
    else { $("bar").style.width = "100%"; finish(); }
  }
  $("back").onclick = function () { if (!locked && idx > 0) { idx--; renderQ(); } };

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

  // 막대는 0에서 시작해서 결과 화면이 뜬 뒤 채워지도록 data-w에 목표 값을 담아 둠
  function bars(tally, code) {
    if (!tally) return "";
    var html;
    if (isTypes) {
      var total = answers.length || 1;
      html = Object.keys(test.results).map(function (k) {
        var p = Math.round(tally[k] / total * 100);
        return '<div class="axis"><div class="names"><span class="' + (tally[k] === Math.max.apply(null, Object.keys(tally).map(function (x) { return tally[x]; })) ? "win" : "") + '">' +
          esc(test.results[k].name) + '</span><span>' + p + '%</span></div><div class="bar"><i style="width:0" data-w="' + p + '"></i></div></div>';
      }).join("");
    } else {
      html = test.axes.map(function (ax, i) {
        var t = tally[ax.key], total = t.a + t.b, pa = Math.round(t.a / total * 100);
        var aWins = code.charAt(i) === ax.a; // 동점일 때도 실제 결과 글자와 강조가 일치하도록 결과 코드 기준
        return '<div class="axis"><div class="names"><span class="' + (aWins ? "win" : "") + '">' +
          esc(ax.aName) + " " + pa + '%</span><span class="' + (!aWins ? "win" : "") + '">' +
          esc(ax.bName) + " " + (100 - pa) + '%</span></div><div class="bar"><i style="width:0" data-w="' + pa + '"></i></div></div>';
      }).join("");
    }
    return '<div class="axes">' + html + "</div>";
  }

  function list(arr) { return "<ul>" + arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>"; }

  var KAKAO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C6.48 3 2 6.58 2 11c0 2.86 1.87 5.37 4.68 6.78l-.96 3.5a.4.4 0 0 0 .61.43L10.5 19.1c.49.06.99.1 1.5.1 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/></svg>';

  function renderResult(code, tally) {
    var r = test.results[code];
    if (!r) { show("intro"); return; }
    shownCode = code;
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
      '<button class="btn kakao" id="kakao">' + KAKAO_ICON + '카카오톡으로 공유하기</button>' +
      '<button class="btn ghost" id="copy">링크 복사하기</button>' +
      '<button class="btn ghost" id="retry">다시 테스트하기</button>' +
      '<a class="btn ghost" href="index.html">다른 테스트 보기</a></div>';
    // 위에서부터 차례로 나타나도록 순서를 매김
    Array.prototype.forEach.call($("result").children, function (el, i) { el.style.setProperty("--i", i); });
    // 막대 채우기
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll("#result .bar i"), function (el) {
        el.style.width = el.getAttribute("data-w") + "%";
      });
    }, 450);
    $("kakao").onclick = shareKakao;
    $("copy").onclick = copyLink;
    $("retry").onclick = function () {
      history.replaceState(null, "", "?id=" + test.id);
      answers = []; idx = 0; show("intro");
    };
    show("result");
  }

  /* ===== 공유 ===== */
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("on");
    setTimeout(function () { t.classList.remove("on"); }, 1900);
  }
  function startUrl() { var u = new URL(location.href); u.search = "?id=" + test.id; u.hash = ""; return u.href; }
  function resultUrl() { return location.href; }

  function copyLink() {
    var url = resultUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { toast("링크를 복사했어요"); }, function () { prompt("링크를 복사하세요", url); });
    } else { prompt("링크를 복사하세요", url); }
  }
  // 카카오 키가 없거나 카카오 공유가 안 될 때: 폰의 기본 공유 창(카카오톡 포함) → 안 되면 링크 복사
  function shareFallback() {
    var r = test.results[shownCode];
    if (navigator.share) {
      navigator.share({ title: test.title, text: "나의 결과: " + r.name + " — " + r.tagline, url: resultUrl() }).catch(function () {});
    } else { copyLink(); }
  }
  function loadKakaoSdk(done) {
    if (window.Kakao) { done(true); return; }
    var s = document.createElement("script");
    s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    s.onload = function () { done(true); };
    s.onerror = function () { done(false); };
    document.head.appendChild(s);
  }
  function shareKakao() {
    var key = SITE.kakaoJsKey;
    if (!key) { shareFallback(); return; }
    loadKakaoSdk(function (ok) {
      if (!ok || !window.Kakao) { shareFallback(); return; }
      try {
        if (!Kakao.isInitialized()) Kakao.init(key);
        var r = test.results[shownCode];
        var start = startUrl();
        Kakao.Share.sendDefault({
          objectType: "feed",
          content: {
            title: "나의 결과: " + r.name,
            description: r.tagline + " · " + test.title,
            imageUrl: new URL(testImage(test), location.href).href, // 카카오는 인터넷에서 접근 가능한 전체 주소가 필요
            link: { mobileWebUrl: start, webUrl: start }
          },
          buttons: [
            { title: "나도 테스트하기", link: { mobileWebUrl: start, webUrl: start } },
            { title: "내 결과 보기", link: { mobileWebUrl: resultUrl(), webUrl: resultUrl() } }
          ]
        });
      } catch (e) { shareFallback(); }
    });
  }

  // 결과 링크로 바로 들어온 경우
  var r = params.get("r");
  if (r && test.results[r]) renderResult(r, null);
  else show("intro");
})();
