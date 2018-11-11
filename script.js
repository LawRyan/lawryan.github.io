	$(document).ready(function(){

        AOS.init();

				$('.gallery').flickity({
  					// options
  				cellAlign: 'left',
  				contain: 'True'
  				// autoPlay: 'True'
				});

			 $('a').smoothScroll({
            	// direction:'top',
            	speed:1000,
              offset:-50
        	});


       $('.fas.fa-bars').on('click', function(){
          // toggle class show on the menu
          $('.menu').toggleClass('show');
        });

      $('.menu li').on('click', function(){
           $('.menu').toggleClass('show');
      });
  
		});



   var prevScrollpos = window.pageYOffset;
      window.onscroll = function() {
        var w = window.innerWidth;
        var mobile = "786";
        var currentScrollPos = window.pageYOffset;
        if (w > mobile) {
          if (prevScrollpos > currentScrollPos) {
            document.getElementById("navbar").style.top = "0";
          } else {
            document.getElementById("navbar").style.top = "-50px";
          }
            prevScrollpos = currentScrollPos;
        } else{
          document.getElementById("navbar").style.top = "0";
        }
      }



var options = {
  strings: ["<i>Banking</i> Analyst.","<i>Web</i> Developer.", "<i>Process</i> Automater.",
   "<i>Amateur</i> Cook."],
  typeSpeed: 80,
  backSpeed: 40,
  loop: true,
  loopCount: Infinity,
  backDelay: 3000,



}

var typed = new Typed("#test", options);