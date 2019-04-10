$(function(){

setTimeout(function(){

		if (localStorage.name){
				$('.container h1').html(`${localStorage.name}'s to do list`)
		}else{
			const name = prompt("What is your name");
			$('.container h1').html(`${name}'s to do list`);
			 localStorage.setItem("name",`${name}`);
		}
},500); 

var savedList = JSON.parse(localStorage.savedListItems || null) || {};
			$('ul').append(savedList);
			console.log(savedList);

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
			if ($(this).hasClass('completed')){
				$(this).remove();
			}else{
				$(this).toggleClass("completed");
				$(this).find('span.check').toggleClass('todo done');
			}
		});





});

window.addEventListener("unload", function(event) { //when the window is closed
	var list = document.getElementById('list').innerHTML;
	localStorage.setItem("savedListItems",  JSON.stringify(list)); // save selected color to localStorage
	});
