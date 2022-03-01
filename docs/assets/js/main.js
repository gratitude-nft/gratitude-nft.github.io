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

    


    if(jQuery.cookie('presalecookie') == 1) {
      jQuery('#presale-page .they-can-mint').hide();
      jQuery('#presale-page .no-can-mint').show();
    }
    else {
      jQuery('#presale-page .they-can-mint').show();
      jQuery('#presale-page .no-can-mint').hide();
    }
    

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

    function fixFilter() {
      if(dataBackground != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-background='"+dataBackground+"'])").hide();
      }

      if(dataLeaf != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-leaf='"+dataLeaf+"'])").hide();
      }

      if(dataPetals != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-petals='"+dataPetals+"'])").hide();
      }
      if(dataEyes != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-eyes='"+dataEyes+"'])").hide();
      }

      if(dataEyesAcc != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-eyes-accessories='"+dataEyesAcc+"'])").hide();
      }

      if(dataHeadAcc != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-head-accessories='"+dataHeadAcc+"'])").hide();
      }

      if(dataNeckAcc != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-neck-accessories='"+dataNeckAcc+"'])").hide();
      }

      if(dataMainAcc != "All") {
        jQuery(".gallery-img-wrapper:not(.gallery-img-wrapper[data-main-accessories='"+dataMainAcc+"'])").hide();
      }
    }

    jQuery('#attribute-input-id').on('keyup',function(){
      dataGratitudeID = jQuery('#attribute-input-id').val();

      jQuery(".attribute-select")[0].selectedIndex = 0;
      jQuery(".attribute-select")[1].selectedIndex = 0;
      jQuery(".attribute-select")[2].selectedIndex = 0;
      jQuery(".attribute-select")[3].selectedIndex = 0;
      jQuery(".attribute-select")[4].selectedIndex = 0;
      jQuery(".attribute-select")[5].selectedIndex = 0;
      jQuery(".attribute-select")[6].selectedIndex = 0;
      jQuery(".attribute-select")[7].selectedIndex = 0;

      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-gratitude-id='"+dataGratitudeID+"']").fadeIn();

      if(!jQuery('#attribute-input-id').val()) {
        jQuery('.gallery-img-wrapper').show();
      }

      jQuery('html, body').animate({scrollTop: '+=1px'});
    });

    jQuery('.attribute-select').on('change',function(){

      dataBackground = jQuery('#attribute-select-background').val();
      dataLeaf = jQuery('#attribute-select-leaf').val();
      dataPetals = jQuery('#attribute-select-petals').val();
      dataEyes = jQuery('#attribute-select-eyes').val();
      dataEyesAcc = jQuery('#attribute-select-eyes-acc').val();
      dataHeadAcc = jQuery('#attribute-select-head-acc').val();
      dataNeckAcc = jQuery('#attribute-select-neck-acc').val();
      dataMainAcc = jQuery('#attribute-select-main-acc').val();

      jQuery('#attribute-input-id').val('');

      jQuery('html, body').animate({scrollTop: '+=5px'}, 300);
    });

    jQuery('#attribute-select-background').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-background='"+dataBackground+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-leaf').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-leaf='"+dataLeaf+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-petals').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-petals='"+dataPetals+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-eyes').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-eyes='"+dataEyes+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-eyes-acc').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-eyes-accessories='"+dataEyesAcc+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-head-acc').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-head-accessories='"+dataHeadAcc+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-neck-acc').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-neck-accessories='"+dataNeckAcc+"']").fadeIn();

      fixFilter();
    });

    jQuery('#attribute-select-main-acc').on('change',function() {
      jQuery('.gallery-img-wrapper').hide();

      jQuery(".gallery-img-wrapper[data-main-accessories='"+dataMainAcc+"']").fadeIn();

      fixFilter();
    });

    jQuery('.reset-gallery-filters').on("click", function() {
      jQuery(".attribute-select")[0].selectedIndex = 0;
      jQuery(".attribute-select")[1].selectedIndex = 0;
      jQuery(".attribute-select")[2].selectedIndex = 0;
      jQuery(".attribute-select")[3].selectedIndex = 0;
      jQuery(".attribute-select")[4].selectedIndex = 0;
      jQuery(".attribute-select")[5].selectedIndex = 0;
      jQuery(".attribute-select")[6].selectedIndex = 0;
      jQuery(".attribute-select")[7].selectedIndex = 0;
      jQuery('#attribute-input-id').val('');
      jQuery('.gallery-img-wrapper').show();
    });


    /* Gallery Filter Ends Here */

    /* Get Whitelisted JS Starts Here **/

    const form = document.getElementById('google-form')
    const frame = document.getElementById('google-frame')
    const button = form.querySelector('button')
    
    form.addEventListener('submit', () => {
        button.disabled = true
        button.innerText = 'Working...'
    })
    
    let loaded = 0
    frame.addEventListener('load', () => {
        if (loaded++ > 0) {
        button.innerText = 'Submit'
        jQuery('p.success-msg').show();
        }
    })

    jQuery("#gnft-get-whitelisted input[type='text']").on("change",function(){
      if(!jQuery('.discord-w-input').val() && !jQuery('.twitter-w-input').val()) {
        jQuery("button[type='submit']").attr('disabled',true);
      }
      else if(jQuery('.discord-w-input').val() || jQuery('.twitter-w-input').val()) {
        jQuery("button[type='submit']").attr('disabled',false);
      }
      jQuery('p.success-msg').hide();
    })

    /* Get Whitelisted JS Ends Here **/

    /* Newsletter JS Starts Here **/
 
    jQuery("#gnft-newsletter input[type='text']").on("change",function(){
      if(!jQuery('.email-address-input').val()) {
        jQuery("button[type='submit']").attr('disabled',true);
      }
      else if(jQuery('.email-address-input').val()) {
        jQuery("button[type='submit']").attr('disabled',false);
      }
      jQuery('p.success-msg').hide();
    });

    jQuery("#gnft-newsletter input[type='text']").on("keyup",function(){
      if(!jQuery('.email-address-input').val()) {
        jQuery("button[type='submit']").attr('disabled',true);
      }
      else if(jQuery('.email-address-input').val()) {
        jQuery("button[type='submit']").attr('disabled',false);
      }
      jQuery('p.success-msg').hide();
    });

    /* Newsletter JS Ends Here **/

    console.clear();

});

