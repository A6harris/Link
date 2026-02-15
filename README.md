# Link (WORKING APP NAME)

Stay connected to the people who matter.

---

## Getting Started from Scratch


### Prerequisites

- macOS (Intel or Apple Silicon)
- [Homebrew](https://brew.sh/) package manager
- Git (comes with Xcode Command Line Tools — run `xcode-select --install` if needed)
- [Expo Go](https://expo.dev/client) app installed on your phone

### 1. Install nvm (Node Version Manager)

```bash
brew install nvm
```

Create nvm's working directory:

```bash
mkdir ~/.nvm
```

Add these lines to your `~/.zshrc` (open it with `nano ~/.zshrc` or your preferred editor):

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

Reload your shell and verify:

```bash
source ~/.zshrc
nvm --version
```

> **Note:** nvm lets you have different Node versions for different projects. The version you install here **only applies to this repository** when you're in this directory — it won't affect other projects.

### 2. Clone the Repository

```bash
git clone https://github.com/evankauh/Link.git
cd Link
```

### 3. Use the Correct Node Version

This project requires **Node 18.x** (specified in `.nvmrc`). Install and use it:

```bash
nvm install 18
nvm use 18
```

Verify:

```bash
node -v  # Should show v18.x.x
npm -v   # Should show v9.x.x or v10.x.x
```

> **Tip:** To automatically switch Node versions when you `cd` into this directory, add this to your `~/.zshrc`:
>
> ```bash
> # Auto-switch Node version based on .nvmrc
> autoload -U add-zsh-hook
> load-nvmrc() {
>   if [[ -f .nvmrc && -r .nvmrc ]]; then
>     nvm use
>   fi
> }
> add-zsh-hook chpwd load-nvmrc
> load-nvmrc
> ```

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 6. Start the Development Server

```bash
npm start
```

### 7. View the App

**On a Physical Device:**

1. Open the Expo Go app on your phone
2. Scan the QR code displayed in the terminal

**On a Simulator:**

```bash
npm run ios      # iOS Simulator (requires Xcode — or press i after running npm start)
npm run android  # Android Emulator (requires Android Studio)
```

---

## Continuous Development Workflow

Once you've completed the initial setup, here's how to work on the project day-to-day.

### Starting a New Work Session

```bash
cd Link              # Navigate to the project folder
nvm use              # Switch to the correct Node version (auto if you set up the .zshrc hook)
npm start            # Start the Expo dev server
```

### Branching & Feature Development

We use **branches** to keep work isolated. The `main` branch should always be stable.

#### Create a new feature branch

Always branch off of `main` when starting new work:

```bash
git checkout main              # Make sure you're on main
git pull origin main           # Get the latest changes
git checkout -b my-feature     # Create and switch to a new branch
```

Branch naming conventions:

| Prefix | Use for | Example |
| --- | --- | --- |
| `new-feature/` | New features | `new-feature/login` |
| `fix/` | Bug fixes | `fix/crash-on-empty-list` |
| `refactor/` | Code cleanup | `refactor/home-screen` |
| `EK-` | Personal dev branches | `EK-Refactoring` |

#### Make changes and commit

```bash
git add .                          # Stage all changes
git commit -m "Add login screen"   # Commit with a descriptive message
```

Or stage and commit specific files:

```bash
git add src/screens/auth/LoginScreen.tsx
git commit -m "Fix login validation bug"
```

#### Push your branch to GitHub

```bash
git push origin my-feature         # First push — creates the remote branch
git push                           # Subsequent pushes (after the remote branch exists)
```

### Switching Between Branches

```bash
git branch                         # List local branches (* marks the current one)
git checkout main                  # Switch to main
git checkout new-feature/login     # Switch to another branch
```

> **Important:** If you have uncommitted changes that conflict with the branch you're switching to, Git will block the switch. You have two options:
>
> **Option A — Commit your work:**
> ```bash
> git add .
> git commit -m "WIP: save progress"
> ```
>
> **Option B — Stash your work temporarily:**
> ```bash
> git stash                          # Saves changes and reverts to clean state
> git checkout other-branch          # Switch branches
> # ... do work on other branch ...
> git checkout my-feature            # Come back
> git stash pop                      # Restore your saved changes
> ```

### Merging Your Work into Main

When a feature branch is ready, merge it back into `main`:

```bash
git checkout main                  # Switch to main
git pull origin main               # Get latest changes
git merge my-feature               # Merge your feature branch into main
git push origin main               # Push the updated main to GitHub
```

If there are merge conflicts, Git will tell you which files need fixing. Open the conflicted files, resolve the markers (`<<<<<<<`, `=======`, `>>>>>>>`), then:

```bash
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

### Cleaning Up Old Branches

After merging, delete branches you no longer need:

```bash
git branch -d my-feature           # Delete local branch
git push origin --delete my-feature  # Delete remote branch
```

### Pulling Latest Changes

If someone else pushed changes (or you pushed from a different machine):

```bash
git pull origin main               # Pull latest main
git pull                           # Pull latest for current branch
```

### Quick Reference

| Task | Command |
| --- | --- |
| See current branch | `git branch` |
| See status of changes | `git status` |
| See commit history | `git log --oneline -10` |
| Create & switch to new branch | `git checkout -b branch-name` |
| Switch to existing branch | `git checkout branch-name` |
| Stage all changes | `git add .` |
| Commit changes | `git commit -m "message"` |
| Push to GitHub | `git push origin branch-name` |
| Pull latest | `git pull origin branch-name` |
| Stash uncommitted work | `git stash` |
| Restore stashed work | `git stash pop` |
| Delete local branch | `git branch -d branch-name` |

---

## Scripts

| Command           | Description             |
| ----------------- | ----------------------- |
| `npm start`       | Start Expo dev server   |
| `npm run ios`     | Run on iOS simulator    |
| `npm run android` | Run on Android emulator |
| `npm test`        | Run tests               |

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Features](docs/FEATURES.md)
- [Database Schema](docs/DATABASE.md)
- [Technical Spec](TECHNICAL_SPEC.md)

## Project Structure

```
src/
├── components/    # Reusable UI components
├── screens/       # Screen components
├── navigation/    # React Navigation config
├── store/         # Redux store and RTK Query
├── services/      # External service integrations
├── hooks/         # Custom React hooks
├── types/         # TypeScript definitions
└── utils/         # Helper functions
```

## What is Link?

Link is a mobile app that helps young professionals maintain friendships. It:

1. **Suggests who to contact** based on recency, upcoming events, and user-defined cadences
2. **Provides context** about each friend (last conversation, upcoming birthday)
3. **Tracks interactions** to show which friendships need attention
4. **Removes friction** with quick-action buttons to call, text, or snooze reminders

## Tech Stack

| Layer     | Technology                      |
| --------- | ------------------------------- |
| Framework | React Native 0.81 + Expo SDK 54 |
| Language  | TypeScript 5.9                  |
| State     | Redux Toolkit + RTK Query       |
| Backend   | Supabase                        |

## License

Proprietary and confidential.
