import { Player, world, system } from "@minecraft/server"

let target = null;
const winLevel = 5;
const titleDuration = 160;

// The first player who enters the world becomes the Target
// TODO: Make a button that will set the target to any player
world.afterEvents.playerSpawn.subscribe(spawnData => {
    const player = spawnData.player;

    // Init
    system.run(() => {
        // Clear the inventory
        const inventory = player.getComponent("minecraft:inventory");
        if (inventory && inventory.container) {
            inventory.container.clearAll();
        }

        // Reset level
        player.resetLevel();

        // Clear any lingering titles
        player.onScreenDisplay.resetHudElements();
    });

    // Set up players
    system.runTimeout(() => {
        if (target == null) {
            initTarget(player);
        } else {
            if (target !== player) {
                initAssassin(player);
            }
        }
    }, 2);
});

world.afterEvents.entityDie.subscribe(deathEvent => {
    if (deathEvent.deadEntity instanceof Player) {
        // If the target dies
        if (deathEvent.deadEntity == target) {
            if (deathEvent.damageSource.damagingEntity instanceof Player) {
                assassinWinState(deathEvent.damageSource.damagingEntity);
            }
        }
    }
    
});

world.beforeEvents.itemUse.subscribe(data => {
    const player = data.source
    if (!(player instanceof Player)) return;
    if (data.itemStack.typeId === 'minecraft:compass') {
        if (target != null) {
            player.sendMessage(`Seeking target ${target.name}...`);
            target.sendMessage('Someone is seeking you...');
            const targetLocation = target.location;
            const playerLocation = player.location;
            const newPlayerSpawn = {
                x: playerLocation.x,
                y: playerLocation.y,
                z: playerLocation.z,
                dimension: player.dimension,
            };
            system.run(() => {
                // Set compass to location of target
                world.setDefaultSpawnLocation(targetLocation);

                // Set new spawn point for assassin player
                player.setSpawnPoint(newPlayerSpawn);
            });
        }
    }
});

function initTarget(player) {
    target = player;
    target.onScreenDisplay.setTitle("Minecraft Manhunt", { 
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: `${target.name}, \nYOU are the assassination target. \nGet to level ${winLevel} \nbefore you're murdered!`
    });
    target.sendMessage(`${target.name}, YOU are the assassination target. Get to level ${winLevel} before you're murdered!`);
    setTargetProperties();
    targetWinCheck();
}

function initAssassin(player) {
    system.runTimeout(() => {
        player.runCommand(`give ${player.name} minecraft:compass 1`);
    }, 2); // Run after two ticks to avoid the initial inventory clearing in main()
    player.onScreenDisplay.setTitle("Minecraft Manhunt", {
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: `${player.name}, you are an assassin! \nUSE your compass \nto find the current location \nof your target.`
    });
    player.sendMessage(`${player.name}, you are an assassin! Use your compass to find the current location of your target.`);
    setAssassinProperties(player);
}

function setAssassinProperties(player) {
    system.runTimeout(() => setAssassinProperties(player), 600);    
}

function setTargetProperties() {
    // Set increased speed
    target.addEffect("minecraft:speed", 600, { showParticles: false });
    system.runTimeout(setTargetProperties, 600);
}

function targetWinCheck() {
    if (target.level >= winLevel) {
        targetWinState();
        assassinsLoseState();
        return;
    } else {
        system.runTimeout(targetWinCheck, 100);
    }
}

function targetWinState() {
    // Clear the inventory
    const inventory = player.getComponent("minecraft:inventory");
    if (inventory && inventory.container) {
        inventory.container.clearAll();
    }
    target.onScreenDisplay.setTitle("You win!", { 
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: `You reached level ${winLevel} \nand beat out the assassins. \nWell done!`
    });
}

function targetLoseState(player) {
    player.onScreenDisplay.setTitle("You lose!", {
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: `Better luck next time.`
    });
    system.runTimeout(() => {
        initAssassin(player);
    }, titleDuration);
}

function assassinWinState(player) {
    player.onScreenDisplay.setTitle("You Win!", {
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: `You are a highly effective killer.`
    });
    system.runTimeout(() => {
        initTarget(player);
    }, titleDuration);
}

function assassinsLoseState() {
    world.getPlayers().forEach(player => {
        if (player !== target) {
            player.onScreenDisplay.setTitle("You lose!", {
                stayDuration: titleDuration,
                fadeInDuration: 2,
                fadeOutDuration: 4,
                subtitle: `You failed to assassinate the target\nbefore they reached level ${winLevel}.\nBetter luck next time.`
            });
        }
    });
}

function runWorldCommand(command) {
    world.getDimension('overworld').runCommandAsync(command);
}