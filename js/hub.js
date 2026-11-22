(function () {
  // 진행 순서(SITE.categories)대로 정렬하고, 테스트가 없는 카테고리는 숨김
  var used = TESTS.map(function (t) { return t.category; });
  var ordered = SITE.categories.filter(function (c) { return used.indexOf(c) !== -1; });
  used.forEach(function (c) { if (ordered.indexOf(c) === -1) ordered.push(c); });
  var cats = ["All"].concat(ordered);
  TESTS.sort(function (a, b) { return cats.indexOf(a.category) - cats.indexOf(b.category); });
  var current = "All";
  var chips = document.getElementById("chips");
  var cards = document.getElementById("cards");

  function render() {
    chips.innerHTML = "";
    cats.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip" + (c === current ? " on" : "");
      b.textContent = c;
      b.onclick = function () { current = c; render(); };
      chips.appendChild(b);
    });
    cards.innerHTML = "";
    TESTS.filter(function (t) { return current === "All" || t.category === current; }).forEach(function (t, i) {
      var a = document.createElement("a");
      a.className = "card";
      a.style.setProperty("--i", i); // 카드가 위에서부터 차례로 나타나는 순서
      a.href = "test.html?id=" + encodeURIComponent(t.id);
      a.style.setProperty("--c", t.color); // 사진이 없을 때 보이는 배경색
      if (t.cardPos) a.style.backgroundPosition = t.cardPos; // 카드에서 사진이 보이는 위치 (테스트 파일의 cardPos)
      a.innerHTML = '<span class="tag"></span><span class="big"></span><h2></h2><p></p>';
      a.querySelector(".tag").textContent = t.category;
      a.querySelector(".big").textContent = t.emoji;
      a.querySelector("h2").textContent = t.title;
      a.querySelector("p").textContent = t.desc;
      // 사진 우선순위: img/<id>-card.jpg(가로형 카드 전용, 테스트에 cardImage: true 를 쓴 경우만) > img/<id>.jpg(정사각형, 시작 화면과 공용)
      var cardLoaded = false;
      function applyImg(src) {
        // CSS 변수 안의 상대 경로는 css 폴더 기준으로 해석되므로, 전체 주소로 바꿔서 넣음
        a.style.setProperty("--img", 'url("' + new URL(src, location.href).href + '")');
        a.classList.add("has-img");
      }
      if (t.cardImage) loadImage("img/" + t.id + "-card.jpg", function (src) { cardLoaded = true; applyImg(src); });
      loadImage(testImage(t), function (src) { if (!cardLoaded) applyImg(src); });
      cards.appendChild(a);
    });
  }
  render();
})();
