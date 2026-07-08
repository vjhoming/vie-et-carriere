// @ts-ignore

export const DEFAULT_GAME_MESSAGES = {
    start: "C'est ta vie qui commence ma p'tite Isabelle ! Avance !",
    restart: "Kossé j'entends là , c'est tu mon ti puffflin qui vient d'être game over ?",
    win: "Félicitations, t'as en emploi en radio communautaire  ! N'oublie pas que la chanteuse Tina Tourné sera en spectacle au Madisson Square garden...",
    cdkc_reached: "Félicitations, t'as en emploi en radio communautaire  ! N'oublie pas que la chanteuse Tina Tourné sera en spectacle au Madisson Square garden...",
    obstacles: {
        bonnet_hit: "Aïe ! Le bonnet m'a fessée en plein visage !",
        bulletin_collect: "Wow ! Excellent bulletin ! +{pts} pts !",
        bourse_collect: "Bourse d'études attrapée ! +{pts} pts !",
        pere_hit: "Ah c'est toi papa ? Tu m'as manqué ! +1000 pts !",
        biere_drunk: "Ca goute pas la bière des pays de l'est!",
        biere_destroy: "Boum ! Kin mon osti +350 pts !",
        seringue_hit: "Ouch !  C'est sur que c'est pas plaisant pour personne hein ?",
        condon_collect: "Sécurité d'abord ! J'ai attrapé le condom protecteur !",
        gars_dodged: "Ouf ! Heureusement que j'avais mon condom !",
        gars_pregnant: "🤰 Oh non ! Enceinte d'un p'tit ! Vitesse divisée par deux !",
        police_hit: "Ouch! Une fille avec une cagoule qui court...",
        guichet_hit: "Aïe ! Le gichet !",
        guichet_destroy: "KABOOM ! Guichet explosé ! la police tabarr... !",
        bac_collect: "🎓 Oui ! J'ai mon {grade} ! Direction CDKC Radio !",
        generic_hit: "Ayoye !",
        generic_destroy: "Kin mon osti ! +350 pts !",
    }
};

export type GameMessagesConfig = typeof DEFAULT_GAME_MESSAGES;

export function getGameMessagesConfig(): GameMessagesConfig {
    const saved = localStorage.getItem('gameMessages');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error("Failed to parse game messages", e);
        }
    }
    return DEFAULT_GAME_MESSAGES;
}

export function saveGameMessagesConfig(data: GameMessagesConfig) {
    localStorage.setItem('gameMessages', JSON.stringify(data));
    localStorage.setItem('gameMessages_edited', 'true');
}

// Helper wrapper for the app to keep existing API
export function getGameMessages() {
    const config = getGameMessagesConfig();
    return {
        ...config,
        obstacles: {
            ...config.obstacles,
            bulletin_collect: (pts: number) => config.obstacles.bulletin_collect.replace('{pts}', pts.toString()),
            bourse_collect: (pts: number) => config.obstacles.bourse_collect.replace('{pts}', pts.toString()),
            bac_collect: (grade: string) => config.obstacles.bac_collect.replace('{grade}', grade),
        }
    };
}

export interface LevelMessage {
    id?: string;
    text: string;
    startOffset: number;
    endOffset: number;
}

export interface LevelItem {
    id?: string;
    type: 'bonnet' | 'bulletin' | 'biere' | 'seringue' | 'condon' | 'gars' | 'bourse' | 'pere' | 'guichet' | 'bac' | 'police';
    x: number;
    zOffset: number; // Distance depuis l'entrée (le début) de la section
    y?: number;
    grade?: string; // Pour bulletin et bac
    pts?: string; // Pour bulletin et bac
    dialogue?: string; // Message d'interaction personnalisé
}

export interface LevelSection {
    id: number; // Numéro de la phase
    name: string;
    type: 'route' | 'ecole';
    length: number; // Longueur totale de cette section (en unités Z)
    
    // Si c'est une école :
    ecoleType?: 'primaire' | 'secondaire' | 'universite' | 'cdkc';
    color?: number;
    
    // Les obstacles/items dans cette section
    items: LevelItem[];
    
    // Les messages qui s'affichent
    messages: LevelMessage[];
}

export const DEFAULT_LEVEL_DATA: LevelSection[] = [
    {
        "id": 1,
        "name": "Début de la vie",
        "type": "route",
        "length": 6000,
        "items": [],
        "messages": [
            {
                "text": "Bon, regarde, tu vois la petite fille sur l'écran là ? Ça, c'est toi,",
                "startOffset": 553,
                "endOffset": 3733
            },
            {
                "text": "Regarde la petite porte là, ça c'est ton école de primaire là. Il faut pas que tu manques la petite porte",
                "startOffset": 3800,
                "endOffset": 6000
            }
        ]
    },
    {
        "id": 2,
        "name": "École Primaire",
        "type": "ecole",
        "length": 11000,
        "ecoleType": "primaire",
        "color": 13840175,
        "items": [
            {
                "type": "bonnet",
                "x": 0,
                "zOffset": 6000
            },
            {
                "type": "bulletin",
                "x": 0,
                "zOffset": 10000,
                "y": 150,
                "grade": "A+",
                "pts": "100 pts"
            }
        ],
        "messages": [
            {
                "text": "le p'tit bonhomme avec le bonnet d'âne, lui il faut pas que tu y touches parce que tu vas avoir un bonnet d'âne toi aussi. Saute par-dessus là, saute par-dessus",
                "startOffset": 2140,
                "endOffset": 6780
            },
            {
                "text": "Ben là, tu vois, t'as le p'tit bulletin là. Va le chercher, lui !",
                "startOffset": 7067,
                "endOffset": 10267
            }
        ]
    },
    {
        "id": 3,
        "name": "Route vers le Secondaire",
        "type": "route",
        "length": 4000,
        "items": [],
        "messages": [
            {
                "text": "Bon, là tu arrives à ton école secondaire là, manque pas l'entrée.",
                "startOffset": 547,
                "endOffset": 4000
            }
        ]
    },
    {
        "id": 4,
        "name": "École Secondaire",
        "type": "ecole",
        "length": 26000,
        "ecoleType": "secondaire",
        "color": 7901340,
        "items": [
            {
                "type": "biere",
                "x": 0,
                "zOffset": 5000
            },
            {
                "type": "seringue",
                "x": -150,
                "zOffset": 10000
            },
            {
                "type": "seringue",
                "x": 0,
                "zOffset": 10500
            },
            {
                "type": "seringue",
                "x": 150,
                "zOffset": 11000
            },
            {
                "type": "condon",
                "x": 150,
                "zOffset": 17000,
                "y": 100
            },
            {
                "type": "gars",
                "x": 0,
                "zOffset": 18000
            },
            {
                "type": "bulletin",
                "x": -200,
                "zOffset": 23000,
                "y": 50,
                "grade": "A+",
                "pts": "500 pts"
            },
            {
                "type": "bulletin",
                "x": -50,
                "zOffset": 23500,
                "y": 100,
                "grade": "B",
                "pts": "400 pts"
            },
            {
                "type": "bulletin",
                "x": 100,
                "zOffset": 24000,
                "y": 150,
                "grade": "C",
                "pts": "300 pts"
            },
            {
                "type": "bulletin",
                "x": 200,
                "zOffset": 24500,
                "y": 50,
                "grade": "E",
                "pts": "200 pts"
            }
        ],
        "messages": [
            {
                "text": " Là, attention, la petite caisse de bière qui s'en vient là, tire dessus avec \"X\" là,",
                "startOffset": 660,
                "endOffset": 5327
            },
            {
                "text": "Ça, c'est trois petites seringues là, tu vas sauter par-dessus.",
                "startOffset": 6467,
                "endOffset": 11240
            },
            {
                "text": "Là, il faut que tu fasses attention à ce p'tit gars-là. Avant d'aller le voir, va chercher le condom qui est là.",
                "startOffset": 12480,
                "endOffset": 18280
            },
            {
                "text": "Bon, là t'as tes bulletins là. Regarde tous les bulletins qui sont là, ils ont tous des points dessus là. Va chercher le plus gros.",
                "startOffset": 19853,
                "endOffset": 24746
            },
            {
                "text": "Ben là, t'auras pas le choix d'aller en communication là.",
                "startOffset": 25073,
                "endOffset": 26000
            }
        ]
    },
    {
        "id": 5,
        "name": "Vie Adulte (Bourse)",
        "type": "route",
        "length": 5000,
        "items": [
            {
                "type": "bourse",
                "x": 0,
                "zOffset": 3000,
                "y": 220
            }
        ],
        "messages": [
            {
                "text": "ça c'est ta bourse ! Va chercher, va chercher ta bourse !",
                "startOffset": 220,
                "endOffset": 3380
            }
        ]
    },
    {
        "id": 6,
        "name": "Rencontre avec le Père",
        "type": "route",
        "length": 2000,
        "items": [],
        "messages": [
            {
                "text": "Regarde, le p'tit bonhomme qui est là, c'est ton père là, avec de l'argent. Pogne-le !",
                "startOffset": 67,
                "endOffset": 1827
            }
        ]
    },
    {
        "id": 7,
        "name": "Guichet et Police",
        "type": "route",
        "length": 4000,
        "items": [
            {
                "type": "pere",
                "x": 0,
                "zOffset": 1000
            },
            {
                "type": "guichet",
                "x": 0,
                "zOffset": 3000
            }
        ],
        "messages": [
            {
                "text": " Ah, tiens, un p'tit guichet automatique qui s'en vient là. Bon, prends ta p'tite bombe puis lance-la.",
                "startOffset": 1180,
                "endOffset": 2913
            },
            {
                "text": "Manque moué pas !",
                "startOffset": 47,
                "endOffset": 1020
            },
            {
                "text": "La police, tabar... Saute par-dessus !",
                "startOffset": 3080,
                "endOffset": 3907
            }
        ]
    },
    {
        "id": 8,
        "name": "Entrée Université",
        "type": "route",
        "length": 3000,
        "items": [],
        "messages": [
            {
                "text": " V'là l'université là, manque pas la porte.",
                "startOffset": 140,
                "endOffset": 2860
            }
        ]
    },
    {
        "id": 9,
        "name": "Université (Graduation)",
        "type": "ecole",
        "length": 12000,
        "ecoleType": "universite",
        "color": 16777215,
        "items": [
            {
                "type": "bac",
                "x": -150,
                "zOffset": 6000,
                "y": 150,
                "grade": "DOCTORAT",
                "pts": "1000 pts"
            },
            {
                "type": "bac",
                "x": 0,
                "zOffset": 6500,
                "y": 150,
                "grade": "MAÎTRISE",
                "pts": "500 pts"
            },
            {
                "type": "bac",
                "x": 150,
                "zOffset": 7000,
                "y": 150,
                "grade": "BAC",
                "pts": "250 pts"
            }
        ],
        "messages": [
            {
                "text": "Bon, là c'est ton bac qui s'en vient là. Saute ! Va le chercher !",
                "startOffset": 520,
                "endOffset": 7273
            },
            {
                "text": "Ce bout-là est bin  niaiseu .",
                "startOffset": 7733,
                "endOffset": 10060
            }
        ]
    },
    {
        "id": 10,
        "name": "Entrée Marché du Travail",
        "type": "route",
        "length": 3000,
        "items": [],
        "messages": [
            {
                "text": "Bon, là c'est rendu que t'as un emploi à CDKC là. Là, fais attention de pas manquer...",
                "startOffset": 33,
                "endOffset": 2886
            }
        ]
    },
    {
        "id": 11,
        "name": "CDKC Radio",
        "type": "ecole",
        "length": 8000,
        "ecoleType": "cdkc",
        "color": 3218322,
        "items": [],
        "messages": []
    }
];

export function getLevelData(): LevelSection[] {
    const CURRENT_VERSION = "2";
    const savedVersion = localStorage.getItem('levelData_version');
    
    if (savedVersion !== CURRENT_VERSION) {
        localStorage.removeItem('levelData');
        localStorage.setItem('levelData_version', CURRENT_VERSION);
        return DEFAULT_LEVEL_DATA;
    }

    const savedLevelData = localStorage.getItem('levelData');
    
    if (savedLevelData) {
        try {
            const parsed = JSON.parse(savedLevelData);
            // Migrate old 'dialogue' to 'messages'
            parsed.forEach((section) => {
                if (!section.messages) {
                    section.messages = [];
                    if (section.dialogue) {
                        section.messages.push({
                            id: Math.random().toString(),
                            text: section.dialogue,
                            startOffset: 0,
                            endOffset: section.length > 3000 ? 3000 : section.length
                        });
                        delete section.dialogue;
                    }
                }
            });
            return parsed;
        } catch (e) {
            console.error("Failed to parse level data", e);
        }
    }
    
    return DEFAULT_LEVEL_DATA;
}

export function saveLevelData(data: LevelSection[]) {
    localStorage.setItem('levelData', JSON.stringify(data));
    localStorage.setItem('levelData_edited', 'true');
}

export function resetToDefault() {
    localStorage.removeItem('levelData');
    localStorage.removeItem('levelData_edited');
    localStorage.removeItem('gameMessages');
    localStorage.removeItem('gameMessages_edited');
}


export function computeAbsoluteMap() {
    const data = getLevelData();
    let currentZ = 0; // Starts at 0, moves negative

    const schools: any[] = [];
    const items: any[] = [];
    const sections: any[] = [];
    const messages: any[] = [];

    for (const section of data) {
        const startZ = currentZ;
        const endZ = currentZ - section.length;

        sections.push({
            id: section.id,
            startZ,
            endZ
        });

        if (section.type === 'ecole') {
            schools.push({
                z: startZ,
                color: section.color,
                ecoleType: section.ecoleType,
                length: section.length
            });
        }

        if (section.items) {
            for (const item of section.items) {
                items.push({
                    type: item.type,
                    x: item.x,
                    absoluteZ: startZ - item.zOffset,
                    y: item.y,
                    grade: item.grade,
                    pts: item.pts,
                    dialogue: item.dialogue
                });
            }
        }

        if (section.messages) {
            for (const msg of section.messages) {
                messages.push({
                    text: msg.text,
                    absoluteStartZ: startZ - msg.startOffset,
                    absoluteEndZ: startZ - msg.endOffset
                });
            }
        }

        currentZ -= section.length;
    }

    return { schools, items, sections, messages };
}
