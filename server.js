import mongoose from "mongoose";
import "dotenv/config";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";


const app = express();

app.use(cors());

app.use(bodyParser.json());

mongoose.connect(process.env.RECIPE_DATABASE);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`listening on port: ${port}`);
});
const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
  },
  text: String,
  rating: String,
}, {
  timestamps: true,
});

const recipeSchema = new mongoose.Schema({
  contributor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contributors",
  },
  cuisine: String,
  title: String,
  ingredients: String,
  instructions: String,
  image: String,
  date: Date,
  user: String,
  reviews: [reviewSchema],
});
const contributorSchema = new mongoose.Schema({
  name: String,
  recipes: [recipeSchema],
});

const userSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  lastLogin: {
    type: Date,
    required: true
  }
})

const Reviews = mongoose.model("Reviews", reviewSchema)
const Recipes = mongoose.model("Recipe", recipeSchema);
const Contributors = mongoose.model("Contributors", contributorSchema);
const Users = mongoose.model("Users", userSchema)


app.post("/AddRecipe", async (req, res) => {
  const email = req.body.email
  try {
    const data = req.body;
    let contributor = await Contributors.findOne({ name: data.contributor });
    if (!contributor) {
      contributor = new Contributors({
        name: data.contributor,
        recipes: [{ cuisine: data.cuisine, title: data.title, ingredients: data.ingredients, instructions: data.instructions, image: data.image, date: data.date }],
      });
      await contributor.save();
    } else {
      contributor.recipes.push({ cuisine: data.cuisine, title: data.title, ingredients: data.ingredients, instructions: data.instructions, image: data.image, date: data.date });
      await contributor.save();
    }
    const user = await Users.findOne({ userEmail: email })
    console.log(user);
    const recipe = new Recipes({
      contributor: contributor._id,
      cuisine: data.cuisine,
      title: data.title,
      ingredients: data.ingredients,
      instructions: data.instructions,
      date: data.date,
      user: user.userEmail
    });
    await recipe.save();
    return res.status(200).json(recipe);
  } catch (err) {
    console.log("ERROR MESSAGE HERE ->", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/AllRecipes", async (req, res) => {
  const recipes = await Recipes.find({});
  res.json(recipes);
});

app.get("/AllContributors", async (req, res) => {
  const contributors = await Contributors.find({});
  res.json(contributors);
});

app.get("/AllContributors/:id", async (req, res) => {
  const contributor = await Contributors.findById(req.params.id)
  const recipes = await Recipes.find({ "Contributors": req.params.id })
  const result = { contributor, recipes }
  res.json(result)
})

app.get("/AllRecipes/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const recipe = await Recipes.findById(id);
    console.log(recipe);
    if (recipe) {
      const contributor = await Contributors.findById(recipe.contributor);
      res.json({ recipe, contributor });
    } else {
      res.status(404).json({ error: "Recipe not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/AllRecipes/:id", async (req, res) => {
  const recipe = await Recipes.findById(req.params.id);
  const contributor = await Contributors.findById(recipe.contributor);
  console.log(contributor.recipes.length)
  if (contributor.recipes.length <= 1) {
    Recipes.deleteOne({ "_id": req.params.id })
    Contributors.deleteOne({ "_id": recipe.contributor })
      .then(() => {
        res.sendStatus(200)
      })
      .catch(error => {
        console.log(error);
        res.sendStatus(500)
      })

  } else if
    (contributor.recipes.length > 1) {
    Recipes.deleteOne({ "_id": req.params.id })
      .then(() => {
        res.sendStatus(200)
      })
      .catch(error => {
        console.log(error);
        res.sendStatus(500)
      })
  }
})

app.put("/AllRecipes/:id", async (req, res) => {
  Recipes.updateOne({ "_id": req.params.id }, { title: req.body.title, ingredients: req.body.ingredients, instructions: req.body.instructions, date: parseInt(req.body.date) })
    .then(() => {
      res.sendStatus(200)
    })
    .catch(error => {
      res.sendStatus(500)
    })
})

app.post("/login", async (req, res) => {
  const now = new Date()
  if (await Users.count({ "userEmail": req.body.email }) === 0) {
    const newuser = new Users({ userEmail: req.body.email, lastLogin: now })
    newuser.save()
      .then(() => {
        res.sendStatus(200)
      })
  } else {
    await Users.findOneAndUpdate({ "userEmail": req.body.email }, { lastLogin: now })
    res.sendStatus(200)
  }
})

app.post("/AllRecipes/:id/AddReview", async (req, res) => {
  try {
    const data = req.body.email;
    let user = await Reviews.findOne({ userEmail: data })
    console.log(req.body);
    console.log(user);
    const recipeId = req.params.id
    const recipe = await Recipes.findById(recipeId)
    console.log(user);
    const createReview = recipe.reviews.create({ ...req.body, user: user })
    recipe.reviews.push(createReview)
    await recipe.save()
    return res.status(200).json(recipe)
    // const review = new Reviews({
    //   user,
    //   recipe,
    //   text,
    //   date: new Date(),
    // });
    // await review.save();
    // const updatedRecipe = await Recipes.findByIdAndUpdate(
    //   recipe,
    //   { $push: { reviews: review._id } },
    //   { new: true }
    // );
    // res.status(200).json(review);
  } catch (err) {
    console.error(err.message);
    ;
  }
});

app.get("/GetReviewsForRecipe/:recipeId", async (req, res) => {
  try {
    const recipeId = req.params.recipeId;
    const reviews = await Reviews.find({ recipe: recipeId }).populate("user");
    res.status(200).json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

