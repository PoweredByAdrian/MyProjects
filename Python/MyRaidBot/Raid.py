def display_menu():
    print("Please choose an option:")
    print("1. Ascend Calculator")
    print("2. Option 2")
    print("3. Option 3")
    print("4. Option 4")
    print("5. Exit")

def get_user_choice():
    while True:
        try:
            choice = int(input("Enter the number of your choice: "))
            if 1 <= choice <= 5:
                return choice
            else:
                print("Please enter a number between 1 and 5.")
        except ValueError:
            print("Invalid input. Please enter a number.")

# Potion costs for each rarity
potion_costs = {
    "U": {
        1: {"affinity": {"lesser": 2, "greater": 0, "superior": 0}, "arcane": {"lesser": 2, "greater": 0, "superior": 0}},
        2: {"affinity": {"lesser": 2, "greater": 0, "superior": 0}, "arcane": {"lesser": 2, "greater": 0, "superior": 0}},
        3: {"affinity": {"lesser": 3, "greater": 0, "superior": 0}, "arcane": {"lesser": 2, "greater": 0, "superior": 0}},
        4: {"affinity": {"lesser": 3, "greater": 0, "superior": 0}, "arcane": {"lesser": 3, "greater": 0, "superior": 0}},
        5: {"affinity": {"lesser": 5, "greater": 0, "superior": 0}, "arcane": {"lesser": 3, "greater": 0, "superior": 0}},
        6: {"affinity": {"lesser": 5, "greater": 0, "superior": 0}, "arcane": {"lesser": 3, "greater": 0, "superior": 0}}
    },
    "R": {
        1: {"affinity": {"lesser": 4, "greater": 0, "superior": 0}, "arcane": {"lesser": 2, "greater": 0, "superior": 0}},
        2: {"affinity": {"lesser": 6, "greater": 0, "superior": 0}, "arcane": {"lesser": 3, "greater": 0, "superior": 0}},
        3: {"affinity": {"lesser": 0, "greater": 2, "superior": 0}, "arcane": {"lesser": 0, "greater": 1, "superior": 0}},
        4: {"affinity": {"lesser": 0, "greater": 2, "superior": 0}, "arcane": {"lesser": 0, "greater": 2, "superior": 0}},
        5: {"affinity": {"lesser": 0, "greater": 5, "superior": 0}, "arcane": {"lesser": 0, "greater": 3, "superior": 0}},
        6: {"affinity": {"lesser": 0, "greater": 6, "superior": 0}, "arcane": {"lesser": 0, "greater": 4, "superior": 0}}
    },
    "E": {
        1: {"affinity": {"lesser": 0, "greater": 4, "superior": 0}, "arcane": {"lesser": 0, "greater": 3, "superior": 0}},
        2: {"affinity": {"lesser": 0, "greater": 7, "superior": 0}, "arcane": {"lesser": 0, "greater": 5, "superior": 0}},
        3: {"affinity": {"lesser": 0, "greater": 9, "superior": 0}, "arcane": {"lesser": 0, "greater": 7, "superior": 0}},
        4: {"affinity": {"lesser": 0, "greater": 0, "superior": 3}, "arcane": {"lesser": 0, "greater": 0, "superior": 1}},
        5: {"affinity": {"lesser": 0, "greater": 0, "superior": 3}, "arcane": {"lesser": 0, "greater": 0, "superior": 2}},
        6: {"affinity": {"lesser": 0, "greater": 0, "superior": 4}, "arcane": {"lesser": 0, "greater": 0, "superior": 2}}
    },
    "L": {
        1: {"affinity": {"lesser": 0, "greater": 0, "superior": 1}, "arcane": {"lesser": 0, "greater": 5, "superior": 0}},
        2: {"affinity": {"lesser": 0, "greater": 0, "superior": 2}, "arcane": {"lesser": 0, "greater": 0, "superior": 2}},
        3: {"affinity": {"lesser": 0, "greater": 0, "superior": 3}, "arcane": {"lesser": 0, "greater": 0, "superior": 2}},
        4: {"affinity": {"lesser": 0, "greater": 0, "superior": 4}, "arcane": {"lesser": 0, "greater": 0, "superior": 3}},
        5: {"affinity": {"lesser": 0, "greater": 0, "superior": 5}, "arcane": {"lesser": 0, "greater": 0, "superior": 4}},
        6: {"affinity": {"lesser": 0, "greater": 0, "superior": 6}, "arcane": {"lesser": 0, "greater": 0, "superior": 5}}
    },
    "M": {
        1: {"affinity": {"lesser": 0, "greater": 0, "superior": 3}, "arcane": {"lesser": 0, "greater": 0, "superior": 2}},
        2: {"affinity": {"lesser": 0, "greater": 0, "superior": 4}, "arcane": {"lesser": 0, "greater": 0, "superior": 3}},
        3: {"affinity": {"lesser": 0, "greater": 0, "superior": 5}, "arcane": {"lesser": 0, "greater": 0, "superior": 4}},
        4: {"affinity": {"lesser": 0, "greater": 0, "superior": 6}, "arcane": {"lesser": 0, "greater": 0, "superior": 5}},
        5: {"affinity": {"lesser": 0, "greater": 0, "superior": 7}, "arcane": {"lesser": 0, "greater": 0, "superior": 6}},
        6: {"affinity": {"lesser": 0, "greater": 0, "superior": 8}, "arcane": {"lesser": 0, "greater": 0, "superior": 7}}
    }
}

def calculate_potions_needed_for_champion(rarity, start_rank, end_rank):
    total_potions = {"lesser": 0, "greater": 0, "superior": 0}
    
    for rank in range(start_rank, end_rank + 1):
        costs = potion_costs[rarity][rank]
        total_potions["lesser"] += costs["affinity"]["lesser"]
        total_potions["greater"] += costs["affinity"]["greater"]
        total_potions["superior"] += costs["affinity"]["superior"]
    
    return total_potions

def calculate_total_potions(champions):
    total_affinity_potions = {"S": {"lesser": 0, "greater": 0, "superior": 0},
                              "F": {"lesser": 0, "greater": 0, "superior": 0},
                              "M": {"lesser": 0, "greater": 0, "superior": 0},
                              "V": {"lesser": 0, "greater": 0, "superior": 0}}
    total_arcane_potions = {"lesser": 0, "greater": 0, "superior": 0}

    for champion in champions:
        rarity, affinity, start_rank, end_rank = champion
        potions_needed = calculate_potions_needed_for_champion(rarity, start_rank, end_rank)

        # Add to the affinity-specific potions
        total_affinity_potions[affinity]["lesser"] += potions_needed["lesser"]
        total_affinity_potions[affinity]["greater"] += potions_needed["greater"]
        total_affinity_potions[affinity]["superior"] += potions_needed["superior"]

        # Add the corresponding arcane potions
        for rank in range(start_rank, end_rank + 1):
            arcane_costs = potion_costs[rarity][rank]["arcane"]
            total_arcane_potions["lesser"] += arcane_costs["lesser"]
            total_arcane_potions["greater"] += arcane_costs["greater"]
            total_arcane_potions["superior"] += arcane_costs["superior"]
    
    return total_affinity_potions, total_arcane_potions

def ascend_calculator():
    champions = []
    
    while True:
        # Rarity input
        valid_rarities = {'U', 'R', 'E', 'L', 'M', 'Q'}  # 'Q' is the flag to quit
        while True:
            rarity = input("Enter the rarity of the champion (U/R/E/L/M): ").upper()
            if rarity in valid_rarities:
                if rarity == 'Q':  # Check if the user wants to quit
                    break
                break
            else:
                print("Invalid rarity. Please enter one of U, R, E, L, M.")
        
        if rarity == 'Q':  # If 'Q' is entered, break out of the loop
            break
        
        # Affinity input
        valid_affinities = {'S', 'F', 'M', 'V'}
        while True:
            affinity = input("Enter the affinity of the champion (S - Spirit, F - Force, M - Magic, V - Void): ").upper()
            if affinity in valid_affinities:
                break
            else:
                print("Invalid affinity. Please enter one of S, F, M, V.")

        # Starting rank input
        while True:
            try:
                start_rank = int(input("Enter the starting rank (1-6): "))
                if 1 <= start_rank <= 6:
                    break
                else:
                    print("Please enter a number between 1 and 6.")
            except ValueError:
                print("Invalid input. Please enter a number.")

        # Ending rank input
        while True:
            try:
                end_rank = int(input("Enter the ending rank (1-6): "))
                if 1 <= end_rank <= 6 and end_rank >= start_rank:
                    break
                else:
                    print("Please enter a number between 1 and 6, and it must be higher than the starting rank.")
            except ValueError:
                print("Invalid input. Please enter a number.")
        
        # Store the champion information
        champions.append((rarity, affinity, start_rank, end_rank))


    # Calculate total potions or output zeros if champions list is empty
    if champions:
        total_affinity_potions, total_arcane_potions = calculate_total_potions(champions)
    else:
        total_affinity_potions = {affinity: {"lesser": 0, "greater": 0, "superior": 0} for affinity in ['S', 'F', 'M', 'V']}
        total_arcane_potions = {"lesser": 0, "greater": 0, "superior": 0}
    
    
    # Display the results
    print("\nTotal potions needed for all champions:")
    for affinity, potions in total_affinity_potions.items():
        print(f"{affinity} Affinity Potions: {potions['lesser']} Lesser, {potions['greater']} Greater, {potions['superior']} Superior")
    
    print(f"\nArcane Potions: {total_arcane_potions['lesser']} Lesser, {total_arcane_potions['greater']} Greater, {total_arcane_potions['superior']} Superior")


def handle_choice(choice):
    if choice == 1:
        print("You chose Ascend Calculator.")
        ascend_calculator()
    elif choice == 2:
        print("You chose Option 2.")
        # Add code for Option 2
    elif choice == 3:
        print("You chose Option 3.")
        # Add code for Option 3
    elif choice == 4:
        print("You chose Option 4.")
        # Add code for Option 4
    elif choice == 5:
        print("Exiting program.")
        exit()

def main():
    while True:
        display_menu()
        choice = get_user_choice()
        handle_choice(choice)

if __name__ == "__main__":
    main()