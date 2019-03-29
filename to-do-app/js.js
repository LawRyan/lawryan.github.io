$(function(){


const name = prompt("What is your name")

$('.container h1').html(`${name}'s to do list`)

//Watch form submit
$('form').on("submit",function(event){

	event.preventDefault()

	

	
		if ($('item').not(null)){
			const toDoItem = $('#item').val();
			const listItem = `<li>
							 <span class="check todo"></span>${toDoItem}	
							 </li>`;
			$('ul').append(listItem);
			$('form')[0].reset();
		};

	});

		$('ul').on("click","li",function(){
			$(this).toggleClass("completed");
			$(this).find('span.check').toggleClass('todo done');
		});
});