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

world.afterEvents.playerDimensionChange.subscribe(dimensionChangeEvent => {
    if (dimensionChangeEvent.player !== target) {
        return;
    }

    if (dimensionChangeEvent.toDimension.id === 'minecraft:nether') {
        targetWinState();
        assassinsLoseState();
    } else {
    }
});

function initTarget(player) {
    target = player;
    const subtitleString = `${target.name}, \nYOU are the assassination target. \n${getWinStateString()} \nbefore you're murdered!`;
    world.setDefaultSpawnLocation(target.location);
    target.sendMessage(subtitleString);
    target.onScreenDisplay.setTitle("Minecraft Manhunt", { 
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: subtitleString,
    });
    setTargetProperties();
}

function initAssassin(player) {
    system.runTimeout(() => {
        player.runCommand(`give ${player.name} minecraft:compass 1`);
    }, 2); // Run after two ticks to avoid the initial inventory clearing in main()
    const subtitleString = `${player.name}, you are an assassin! \nUSE your compass \nto find the current location \nof your target.`;
    player.sendMessage(subtitleString);
    player.onScreenDisplay.setTitle("Minecraft Manhunt", {
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: subtitleString,
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

function targetWinState() {
    system.runTimeout(() => {
        const subtitleString = `You ${getWinStateString('past')} \nand beat out the assassins. \nWell done!`;
        target.sendMessage('You win!' + subtitleString);
        target.onScreenDisplay.setTitle("You win!", { 
            stayDuration: titleDuration,
            fadeInDuration: 2,
            fadeOutDuration: 4,
            subtitle: subtitleString,
        });
    }, 40);
}

function targetLoseState(player) {
    const subtitleString = 'Better luck next time.';
    player.sendMessage('You lose! ' + subtitleString);
    player.onScreenDisplay.setTitle("You lose!", {
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: subtitleString
    });
    system.runTimeout(() => {
        initAssassin(player);
    }, titleDuration);
}

function assassinWinState(player) {
    const subtitleString = 'You are a highly effective killer.';
    player.sendMessage('You win! ' + subtitleString);
    player.onScreenDisplay.setTitle("You Win!", {
        stayDuration: titleDuration,
        fadeInDuration: 2,
        fadeOutDuration: 4,
        subtitle: subtitleString,
    });
    system.runTimeout(() => {
        initTarget(player);
    }, titleDuration);
}

function assassinsLoseState() {
    const subtitleString = `You failed to assassinate the target\nbefore they ${getWinStateString('past')}.\nBetter luck next time.`;
    world.getPlayers().forEach(player => {
        if (player !== target) {
            player.sendMessage('You lose! ' + subtitleString);
            player.onScreenDisplay.setTitle("You lose!", {
                stayDuration: titleDuration,
                fadeInDuration: 2,
                fadeOutDuration: 4,
                subtitle: subtitleString
            });
        }
    });
}

function getWinStateString(tense) {
    switch (tense) {
        case 'past':
            return 'escaped to the Nether';
        default:
            return 'escape to the Nether';
    }
}

function runWorldCommand(command) {
    world.getDimension('overworld').runCommandAsync(command);
}