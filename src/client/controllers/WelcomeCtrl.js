export default class WelcomeCtrl {
  constructor($rootScope, $scope, $location, $state, $http, ViciAuth) {
	$scope.message = "";

	$scope.hashtags = [ "general", "crypto", "fiction", "art", "music", "science", "funny", "photos", "meta" ];

	const displayErrorMessage = (code) => {
		if (code || $location.search().code) {
			switch (code || $location.search().code) {
				case "EMAIL_EXISTS":
					$scope.message = "E-Mail already exists";
					break;
				case "EMAIL_WRONGLY_FORMATTED":
					$scope.message = "E-Mail wrongly formatted!";
					break;
				case "WRONG_PASSWORD":
					$scope.message = "Wrong password";
					break;
				case "NO_USER_FOUND":
					$scope.message = "User not found";
					break;
				case "LOG_IN_WITH_FACEBOOK":
					$scope.message = "Log in with Facebook";
					break;
				default:
					$scope.message = "Login error. Try again...";
			}
		}
	};
	
	displayErrorMessage();

	$rootScope.login = (data) => {
		ViciAuth.login({
			email: data.loginemail,
			password: data.loginpassword
		}).then((User) => {
			$rootScope.user = {
				id: User.userId
			};
			$state.go("starter.thankyou");
		}, function(response) {
			if(response.err){
				if (response.err.code) {
					$state.go("starter.welcome", {
						code: response.err.code
					});
				} else {
					$state.go("starter.login", {
						code: "ERROR"
					});
				}
			}
			
		});
	};

	$rootScope.signup = async (data) => {
		if (!data.username) {
			return alert("Username is required!");
		}
		
		if (!data.password) {
			return alert("Password is required!");
		}
		
		if (!data.email) {
			return alert("Email is required!");
		}

		let User;

		try {
			User = await ViciAuth.signup({
				username: data.username,
				password: data.password,
				email: data.email,
				userType: 0
			});
		} catch (response) {
			return displayErrorMessage(response.data.code)
		}
	
		$rootScope.user = {
			id: User.userId
		};

		$state.go("starter.thankyou");
	};

	/**
	$http.get("/api/hashtags/trending").then(function(response) {
		$scope.hashtags = response.data.map(function(item) {
			return item.hashtag
		});
	});
	 */
}}
