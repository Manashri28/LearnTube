const { generateDisplayTitle, getDisplayTitle } = require('./backend/utils/titleUtils.js');

const titles = [
  "OOPs in Java full course",
  "Python Full Course Beginner to Advanced",
  "Complete Java Programming Course for Beginners",
  "Data Structures and Algorithms Full Course"
];

titles.forEach(title => {
  console.log(`"${title}" -> "${getDisplayTitle({ title })}"`);
});
