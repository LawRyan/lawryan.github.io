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
              offset:-300
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

        

