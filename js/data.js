// 사이트 설정과 공용 도우미. 테스트는 js/tests/ 폴더에 파일 하나씩 있습니다.
// 새 테스트를 만들면 js/tests/ 에 파일을 추가하고, index.html 과 test.html 에 <script> 한 줄씩 추가하세요.
// categories: 허브에 보이는 순서(창업 진행 순서). 테스트가 하나도 없는 카테고리는 자동으로 숨겨집니다.
window.SITE = {
  name: "1인 창업 유형소",
  tagline: "시작 전, 프리랜서, 그리고 내 사업으로",
  categories: ["🌱 시작 전", "💼 프리랜서", "🚀 내 사업으로"],
  // 카카오톡 공유 설정: 카카오 개발자(developers.kakao.com)에서 앱을 만들고 [JavaScript 키]를 아래 따옴표 안에 붙여 넣으세요.
  // 앱 설정의 [플랫폼 → Web]에 사이트 주소(https://pwm9847-debug.github.io)도 등록해야 합니다.
  // 비워 두면 '카카오톡으로 공유하기' 버튼은 폰의 기본 공유 창(카카오톡 포함)을 열고, PC에서는 링크를 복사합니다.
  kakaoJsKey: ""
};

// 사진 규칙: img/<테스트 id>.jpg 파일을 넣으면 허브 카드와 시작 화면에 자동으로 적용됩니다. (예: img/quit-timing.jpg)
// 사진이 없으면 색 배경 + 이모지로 보입니다. 다른 파일명을 쓰려면 테스트에 image: "img/파일명.jpg" 를 추가하세요.
window.testImage = function (test) { return test.image || "img/" + test.id + ".jpg"; };
window.loadImage = function (src, ok) {
  var im = new Image();
  im.onload = function () { ok(src); };
  im.src = src; // 파일이 없으면 onload가 호출되지 않아 기본 배경이 유지됨
};

// 질문 작성 도우미
// qs("축키", [["질문", "첫 번째 선택지(a)", "두 번째 선택지(b)"], ...]) → 질문 배열
// interleave(축1질문들, 축2질문들, ...) → 여러 축의 질문을 번갈아 섞어줌 (2개든 3개든 가능)
window.qs = function (axis, rows) {
  return rows.map(function (r) { return { axis: axis, q: r[0], a: r[1], b: r[2] }; });
};
window.interleave = function () {
  var lists = Array.prototype.slice.call(arguments), out = [];
  var max = Math.max.apply(null, lists.map(function (l) { return l.length; }));
  for (var i = 0; i < max; i++) lists.forEach(function (l) { if (l[i]) out.push(l[i]); });
  return out;
};

window.TESTS = [];
