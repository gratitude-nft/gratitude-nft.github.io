(() => {
  const harlemify = (window, options) => {
    function c(){var e=window.document.createElement("link");e.setAttribute("type","text/css");e.setAttribute("rel","stylesheet");e.setAttribute("href",f);e.setAttribute("class",l);window.document.body.appendChild(e)}
    function h(){var e=window.document.getElementsByClassName(l);for(var t=0;t<e.length;t++){window.document.body.removeChild(e[t])}}
    function p(){var e=window.document.createElement("div");e.setAttribute("class",a);window.document.body.appendChild(e);setTimeout(function(){window.document.body.removeChild(e)},100)}
    function d(e){return{height:e.offsetHeight,width:e.offsetWidth}}
    function v(i){var s=d(i);return s.height>e&&s.height<n&&s.width>t&&s.width<r}
    function m(e){var t=e;var n=0;while(!!t){n+=t.offsetTop;t=t.offsetParent}return n}
    function g(){var e=window.document.documentElement;if(!!window.innerWidth){return window.innerHeight}else if(e&&!isNaN(e.clientHeight)){return e.clientHeight}return 0}
    function y(){if(window.pageYOffset){return window.pageYOffset}return Math.max(window.document.documentElement.scrollTop,window.document.body.scrollTop)}
    function E(e){var t=m(e);return t>=w&&t<=b+w}
    function S(e){e.setAttribute("class",l);e.src=i;e.loop=false;e.addEventListener("play",function(){setTimeout(function(){x(k)},2000);setTimeout(function(){N();p();for(var e=0;e<O.length;e++){T(O[e])}},15500)},true);e.addEventListener("ended",function(){N();h()},true);}
    function x(e){e.className+=" "+s+" "+o}
    function T(e){e.className+=" "+s+" "+u[Math.floor(Math.random()*u.length)]}
    function N(){var e=window.document.getElementsByClassName(s);var t=new RegExp("\\b"+s+"\\b");for(var n=0;n<e.length;){e[n].className=e[n].className.replace(t,"")}}
    
    var {
      player:z,
      minwidth:e,
      minheight:t,
      maxwidth:n,
      maxheight:r,
      song:i,
      styles:f
    } = options;
  
    var s="mw-harlem_shake_me";
    var o="im_first";
    var u=["im_drunk","im_baked","im_trippin","im_blown"];
    var a="mw-strobe_light";
    var l="mw_added_css";
    var C= window.document.getElementsByTagName("*");
  
    var b=g();
    var w=y();
    var k=null;
    for(var L=0;L<C.length;L++){
      var A=C[L];
      if(v(A)){
        if(E(A)){
          k=A;break
        }
      }
    }
    if(A===null){
      console.warn("Could not find a node of the right size. Please try a different page.");
      return
    }
    c();
    S(z);
    var O=[];
    for(var L=0;L<C.length;L++){
      var A=C[L];
      if(v(A)){ O.push(A) }
    }
  }

  const player = document.createElement('audio')
  player.innerHTML = 'Your browser does not support the audio tag.'
  player.style.display = 'none'
  document.body.appendChild(player)
  
  harlemify(window, {
    player: player,
    minwidth: 12,
    minheight: 12,
    maxwidth: 900,
    maxheight: 900,
    song: '//s3.amazonaws.com/moovweb-marketing/playground/harlem-shake.mp3',
    styles: '//s3.amazonaws.com/moovweb-marketing/playground/harlem-shake-style.css'
  })

  window.addEventListener('harlemify-click', () => {
    player.play();
  })

  window.doon('body')
})()