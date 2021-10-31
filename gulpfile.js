'use strict';
//
var gulp = require('gulp');
var sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
var newer = require('gulp-newer');
var log = require('fancy-log'); // use: log("message");
//
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
//

/*
About: How to build TypeScript with gulp
https://www.typescriptlang.org/docs/handbook/gulp.html
*/


////////////////////////////////////////////////////////////////////////
// Processing of the book styles (the code is not being processed yet)
//

gulp.task('book-sass', function () {
	return gulp.src('./_storage/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer({
			cascade: false
		})).pipe(gulp.dest('./_storage'));
});

gulp.task('book-watch', function () {
	gulp.watch('./_storage/**/*.scss', (done) => {
		gulp.series(['book-sass'])(done);
	});
});


////////////////////////////////////////////////////////////////////////
// The Solution Processing
//

//
// Variables
//

const aSrcResFilter = ["./src/**/_assets/**/*", "./src/**/_resource/**/*"];
const strDestPath = "./code";

//
// Functions
//

function doSolutionSass() {
	return gulp.src('./src/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer({
			cascade: false
		}))
		.pipe(gulp.dest(strDestPath));
}

function doSolutionRes() {
	return gulp.src(aSrcResFilter).pipe(newer(strDestPath)).pipe(gulp.dest(strDestPath));
}

//
// Tasks
//

gulp.task('solution-sass', doSolutionSass);

gulp.task('solution-res', doSolutionRes);

gulp.task('app-extra-watch', function () {
	gulp.watch('./src/**/*.scss', { ignoreInitial: false }, (done) => {
		gulp.series(['solution-sass'])(done);
	});

	gulp.watch(aSrcResFilter, { ignoreInitial: false }, (done) => {
		gulp.series(['solution-res'])(done);
	});
});

gulp.task("compile-code", function () {
	return tsProject.src().pipe(tsProject()).js.pipe(gulp.dest("code"));
});

//
// Build Solution Task
//

gulp.task("build-solution", gulp.series("compile-code", "solution-sass", "solution-res"));

