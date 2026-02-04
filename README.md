# Link (WORKING APP NAME)

Stay connected to the people who matter.

## Dev Setup

### Prerequisites

- [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) - **Required**
- Git
- [Expo Go](https://expo.dev/client) app installed on your phone

### Step 1: Install nvm (if you don't have it)

**On macOS with Homebrew:**

```bash
brew install nvm
```

After installation, create nvm's working directory:

```bash
mkdir ~/.nvm
```

Then add these lines to your `~/.zshrc`:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"
```

Reload your shell:

```bash
source ~/.zshrc
```

Verify nvm is installed:

```bash
nvm --version
```

> **Note:** nvm allows you to have different Node versions for different projects. The version you install here **only applies to this repository** when you're in this directory—it won't affect other projects or your global Node installation.

### Step 2: Clone the Repository

```bash
git clone https://github.com/yourusername/link.git
cd link
```

### Step 3: Use the Correct Node Version

This project requires **Node 18.x** (specified in `.nvmrc`). Install and use it:

```bash
nvm install 18
nvm use 18
```

Verify you're using the correct version:

```bash
node -v  # Should show v18.x.x
npm -v   # Should show v9.x.x or v10.x.x
```

> **Tip:** To automatically switch to the correct Node version when you `cd` into this directory, add this to your `~/.zshrc`:
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

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Step 6: Start the Development Server

```bash
npm start
```

### Step 7: View the App

**On Physical Device:**

1. Open Expo Go app on your phone (download from app store)
2. Scan the QR code displayed in the terminal

**On Simulator:**

```bash
npm run ios      # iOS Simulator (requires Xcode. you can also just press i after using npx expo start --clear)
npm run android  # Android Emulator (requires Android Studio)
```

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
