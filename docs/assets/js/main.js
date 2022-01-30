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

    jQuery('.ambassadors-slider').slick({
        arrows: false,
        autoplay: true,
        infinite: true,
        autoplaySpeed: 1500,
        dots: false,
        slidesToShow: 4,
        speed: 500,
        responsive: [
            {
              breakpoint: 1400,
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
            scrollTop: jQuery( jQuery(this).attr('href') ).offset().top
        }, 500);
        return false;
    });

    jQuery('#gnft-provenance table .ipfs-hash-provenance a').text(function(index, text) { 
      return text.replace('https://ipfs.io/ipfs/', ''); 
    });

    AOS.init();


    /* Gallery Filter Starts Here */

    jQuery('.attribute-select').on('change',function(){

      dataGratitudeID = jQuery('#attribute-input-id').val();
      dataBackground = jQuery('#attribute-select-background').val();
      dataLeaf = jQuery('#attribute-select-leaf').val();
      dataPetals = jQuery('#attribute-select-petals').val();
      dataEyes = jQuery('#attribute-select-eyes').val();
      dataEyesAcc = jQuery('#attribute-select-eyes-acc').val();
      dataHeadAcc = jQuery('#attribute-select-head-acc').val();
      dataNeckAcc = jQuery('#attribute-select-neck-acc').val();
      dataMainAcc = jQuery('#attribute-select-main-acc').val();
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-background='"+dataBackground+"'][data-leaf='"+dataLeaf+"'][data-petals='"+dataPetals+"'][data-eyes='"+dataEyes+"'][data-eyes-accessories='"+dataEyesAcc+"'][data-head-accessories='"+dataHeadAcc+"'][data-neck-accessories='"+dataNeckAcc+"'][data-main-accessories='"+dataMainAcc+"']").fadeIn();


    });

    /* Gallery Filter Ends Here */


});

