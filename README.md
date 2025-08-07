# 🎟️ Discord Ticket Bot — Upgraded

A fully featured Discord ticket system built with `discord.js`.

---

## Features

- Panel message with an embed and **Open Ticket** button.  
- When a user clicks, they choose a **category** via select menu (Support, Tech, Billing, Other).  
- Created ticket channel named `ticket-<username>` (sanitized).  
- Ticket embed with metadata and staff control panel (buttons: Claim, Close, Staff Options).  
- Staff-only actions (buttons check staff role).  

---

## Screenshots

![Ticket Panel](https://cdn.discordapp.com/attachments/1382208523697655899/1403160684837077033/image.png?ex=68968ab8&is=68953938&hm=ebdaf6f72f2beb960352f3a3a09b483718f1301a8a2c1377c5230b6517d236cc&)  
*Ticket panel message with "Open Ticket" button.*

![Afrer Setup And Open Ticket](https://cdn.discordapp.com/attachments/1382208523697655899/1403160759017406504/image.png?ex=68968aca&is=6895394a&hm=6241198b21d56f295e41412966185a96745b9ef565823bc9169a2b0b4e357c8f&)  
*User selects ticket category via dropdown menu.*

![Staff Panel](https://cdn.discordapp.com/attachments/1382208523697655899/1403160562631835688/image.png?ex=68968a9b&is=6895391b&hm=bdf27706542dea572bf13c89ecbd586434eec2d4510c5359ee93a69953ef47b3&)  
*Staff panel inside the ticket channel with Claim, Close, and Staff Options buttons.*

---

## Setup & Installation

1. Clone or download this repository.  
2. Fil`.env` your bot token and IDs:
    ```env
    DISCORD_TOKEN=your-bot-token
    CLIENT_ID=your-bot-client-id
    GUILD_ID=your-guild-id  # Optional but recommended for testing
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Deploy slash commands (use `GUILD_ID` for quicker testing):
    ```bash
    npm run deploy
    ```
5. Start the bot:
    ```bash
    npm start
    ```
6. In your Discord server, run `/setup_ticket` and follow prompts to configure the ticket system.

---

## Permissions Required

Ensure the bot has the following permissions in your server:

- Manage Channels  
- Send Messages  
- Embed Links  
- Read Message History  
- Manage Roles (if you want to use staff options that adjust permissions)  

---

## 🛠️ Credits

**Developed by Buffy**  
Discord: `buffyzyd`  
Crafted to elevate support systems — one ticket at a time.

---

## ⚠️ Important Notice

This project and its source code are **strictly prohibited** from being sold, redistributed, or uploaded to other platforms (including GitHub or any other repositories) **without explicit permission from the author**.

You are allowed to use and modify the code **for personal or private use only**.

---

Thank you for using this bot! Feel free to reach out to **Buffy** on Discord if you need support or improvements.
