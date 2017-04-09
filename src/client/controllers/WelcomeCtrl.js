export default class WelcomeCtrl {
  constructor($rootScope, $scope, $location, $state, $http, ViciAuth) {
	$scope.message = "";

	if ($location.search().code) {
		switch ($location.search().code) {
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

	$rootScope.login = function(data) {
		ViciAuth.login(data.loginemail, data.loginpassword).then(function(User) {
			$rootScope.user = {
				id: User.userId
			};
			$state.go("vicigo.feeds");
		}, function(response) {
			if(response.err){
				if (response.err.code) {
					$state.go("starter.login", {
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

	$rootScope.signup = function(data) {
		
		if (!data.username) {
			return alert("Username is required!");
		}
		if (!data.password) {
			return alert("Password is required!");
		}
		if (!data.email) {
			return alert("Email is required!");
		}
		var viciData = {
			username: data.username,
			password: data.password,
			email: data.email
		};
		ViciAuth.signup(viciData).then(function(User) {
			$rootScope.user = {
				id: User.userId
			};
			$state.go("vicigo.feeds");
		}, function(response) {
			if (response.err.code) {
				$state.go("starter.login", {
					code: response.err.code
				});
			}
		});

	};

	$http.get("/api/hashtags/trending").then(function(response) {
		$scope.hashtags = response.data.map(function(item) {
			return item.hashtag
		});
	});
}}
