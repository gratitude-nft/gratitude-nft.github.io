jQuery( document ).ready(function() {

    // window.onscroll = function() {myFunction()};

    // var header = document.getElementById("site-header");
    // var sticky = header.offsetTop;
    
    // function myFunction() {
    //   if (window.pageYOffset > sticky) {
    //     header.classList.add("sticky");
    //   } else {
    //     header.classList.remove("sticky");
    //   }
    // }

    jQuery('.collection-slider').slick({
        arrows: false,
        autoplay: true,
        infinite: true,
        autoplaySpeed: 1500,
        dots: false,
        slidesToShow: 6,
        speed: 500,
        responsive: [
            {
              breakpoint: 1024,
              settings: {
                slidesToShow: 3,
                slidesToScroll: 1,
              }
            },
            {
              breakpoint: 767,
              settings: {
                slidesToShow: 2,
                slidesToScroll: 1,
              }
            }
          ]
    });

    jQuery('a').click(function(){
        jQuery('html, body').animate({
            scrollTop: jQuery( $(this).attr('href') ).offset().top
        }, 500);
        return false;
    });

    jQuery('#gnft-provenance table .ipfs-hash-provenance a').text(function(index, text) { 
      return text.replace('https://ipfs.io/ipfs/', ''); 
  });

    AOS.init();

    console.clear();
});

