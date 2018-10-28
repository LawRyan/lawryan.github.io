	$(function(){

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