
const studySession = {
	mode: false,
	studyTimeSecs:0,
	breakTimeSecs:0,
	remainingStudyDisplay:"00:00:00",
	remainingBreakDisplay:"00:00:00",
	studyStarted:false,
	totalBreakTime:0,
	totalStudyTIme:0
};







document.getElementById("studyBtn").addEventListener("click",manualStudy); 
document.getElementById("lunchBreak").addEventListener("click",lunchBreak); 
document.getElementById("morningBreak").addEventListener("click",morningBreak); 
document.getElementById("resetBtn").addEventListener("click",reset); 

function reset(){
	location.reload();
}

function manualStudy(){
	const {mode} = studySession;

	if (!studySession.studyStarted){
		const timeInMins = prompt("How long do you wish to study for(minutes)");
		studySession.remainingStudyDisplay = timeInMins.minsToHHMMSS();
		studySession.studyTimeSecs = timeInMins *60;
		studySession.studyStarted = true;
	}

	//Triggers Break Mode
	if (mode){
		$(".hero-right").toggleClass("hero-transition");
		$(".hero-left").removeClass("hero-transition");
		$(".hero-left").toggleClass("hero-transition-restart");
		$("button").css({"background-color":"black","color":"white"});
		updateMode();
	//Triggers study mode
	}else{
		$(".hero-left").toggleClass("hero-transition");
		$(".hero-right").removeClass("hero-transition");
		$(".hero-left").removeClass("hero-transition-restart");
		$("button").css({"background-color":"white","color":"black","border":"1px solid black"});
		studySession.remainingBreakDisplay = ("5").minsToHHMMSS();
		studySession.breakTimeSecs = 5*60;	
		updateMode();
	}

}

function lunchBreak(){
		$(".hero-left").toggleClass("hero-transition");
		$(".hero-right").removeClass("hero-transition");
		$(".hero-left").removeClass("hero-transition-restart");
		$("button").css({"background-color":"black","color":"white"});
		studySession.remainingBreakDisplay = ("20").minsToHHMMSS();
		studySession.breakTimeSecs = 20*60;	
		updateMode();
}

function morningBreak(){
		$(".hero-left").toggleClass("hero-transition");
		$(".hero-right").removeClass("hero-transition");
		$(".hero-left").removeClass("hero-transition-restart");
		$("button").css({"background-color":"black","color":"white"});
		studySession.remainingBreakDisplay = ("10").minsToHHMMSS();
		studySession.breakTimeSecs = 10*60;	
		updateMode();
}


	function updateMode(){
	
		if (studySession.startedStudying){
			$('#timer').text(studySession.remainingStudyDisplay);
		}



		if (studySession.mode){
			studySession.mode = false;
			$("#status").text('Break Time');
			$("#studyBtn").text("Continue Studying");
			$("#statsBtn").toggleClass("hide");
			$("#resetBtn").toggleClass("hide");
			$("#lunchBreak").toggleClass("hide");
			$("#morningBreak").toggleClass("hide");
			$('#timer').text(studySession.remainingBreakDisplay);
		}else{
			studySession.mode = true;

			$("#status").text('Study Time');
			$("#studyBtn").text("Break 5 Mins");
			$("#statsBtn").toggleClass("hide");
			$("#resetBtn").toggleClass("hide");
			$("#lunchBreak").toggleClass("hide");
			$("#morningBreak").toggleClass("hide");
			$('#timer').text(studySession.remainingStudyDisplay);
		}
	};






	
		setInterval(oneSecondFunction, 1000);
	


function oneSecondFunction() {	
	if(studySession.mode){
		if(studySession.studyTimeSecs>0){
			studySession.studyTimeSecs -= 1;
			const timeRemaining = (studySession.studyTimeSecs/60);
			studySession.remainingStudyDisplay= ("" + timeRemaining +"").minsToHHMMSS();
			$('#timer').text(studySession.remainingStudyDisplay);	
		}
	}else if(!studySession.mode){
		if(studySession.breakTimeSecs>0){
			studySession.breakTimeSecs -= 1;
			const timeRemaining = (studySession.breakTimeSecs/60);
			studySession.remainingBreakDisplay= ("" + timeRemaining +"").minsToHHMMSS();
			$('#timer').text(studySession.remainingBreakDisplay);	
		}
	}
};





//Time Converter
	String.prototype.minsToHHMMSS = function () {
		    let mins_num = parseFloat(this, 10);
		    let hours   = Math.floor(mins_num / 60);
		    let minutes = Math.floor((mins_num - ((hours * 3600)) / 60));
		    let seconds = Math.floor((mins_num * 60) - (hours * 3600) - (minutes * 60));

		    // Appends 0 when unit is less than 10
		    if (hours   < 10) {hours   = "0"+hours;}
		    if (minutes < 10) {minutes = "0"+minutes;}
		    if (seconds < 10) {seconds = "0"+seconds;}
		    return hours+':'+minutes+':'+seconds;
		};



//toDO - casche all your selectors