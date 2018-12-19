var gameInSession, globalScores, currentScore, activePlayer;
alert('First to 10 wins');
init();




/*Initialize*/
function init(){
	gameInSession = true;
	globalScores=[0,0];
	currentScore=0;
	activePlayer=0;

	document.getElementById('score-0').textContent ='0';
	document.getElementById('score-1').textContent ='0';
	document.getElementById('current-0').textContent ='0';
	document.getElementById('current-1').textContent ='0';
	document.querySelector('.dice').style.display = 'none';
	document.querySelector('.player-0-panel').classList.remove('winner');
	document.querySelector('.player-1-panel').classList.remove('winner');
    document.querySelector('.player-0-panel').classList.add('active');
    document.querySelector('#name-0').textContent = 'Player 1';
    document.querySelector('#name-1').textContent = 'Player 2';

};

/*Roll Dice*/
document.querySelector('.btn-roll').addEventListener('click', function(){
	if (gameInSession){
		var dice = Math.floor(Math.random() * 6) + 1;

		/*Display Dice Roll*/
		var diceDom = document.querySelector('.dice');
		diceDom.style.display = 'block';
		diceDom.src= "dice-" + dice + ".png";
		
		/*Add Score*/
		if (dice != 1){
			currentScore += dice;
			document.querySelector('#current-' + activePlayer).textContent = currentScore;
		}else{
			nextPlayer();
		}	
	};
})

/*Next Player*/
function nextPlayer(){
	currentScore = 0;
	document.querySelector('#current-' + activePlayer).textContent = currentScore;
	activePlayer === 0 ? activePlayer = 1 : activePlayer = 0;
	document.querySelector('.player-0-panel').classList.toggle('active');
	document.querySelector('.player-1-panel').classList.toggle('active');
	document.querySelector('.dice').style.display = 'none';
	currentScore = 0;
}

/*Hold*/
document.querySelector('.btn-hold').addEventListener('click',function(){
	if (gameInSession){
		globalScores[activePlayer] += currentScore;
		document.getElementById('score-'+ activePlayer).textContent = globalScores[activePlayer];

		if (globalScores[activePlayer]>=10) {
			winner();
		}else{
			nextPlayer();
		}
	}

})

/*Winner*/
function winner(){
	document.querySelector('#name-' + activePlayer).textContent = 'Winner!';
    document.querySelector('.dice').style.display = 'none';
    document.querySelector('.player-' + activePlayer + '-panel').classList.add('winner');
    document.querySelector('.player-' + activePlayer + '-panel').classList.remove('active');
    gameInSession = false;
}

/*New Game*/
document.querySelector('.btn-new').addEventListener('click',init);
