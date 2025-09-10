import type {
    IStateMachine,
    IState
} from "../../types/state-machine-cat.d.mts";

export interface IStateWithParent extends IState {
    parent: IStateWithParent | null;
    statemachine?: IExeStateMachine;
}

// Executable state machine
export interface IExeStateMachine extends IStateMachine {
    curstate: IStateWithParent | null;
}

// Deliberately using state-machine-cat interfaces, cast downstream if needed
export function findStateShallow(sm: IStateMachine, state: string): IState | null {
    for (let j = 0; j < sm.states.length; ++j) {
        if (sm.states[j].name == state) {
            return sm.states[j]
        }
    }
    return null
}

// Deliberately using state-machine-cat interfaces, cast downstream if needed
export function findStateDeep(sm: IStateMachine, stateName: string): IState | null {
    // Try to find in direct child states
    for (let j = 0; j < sm.states.length; ++j) {
        if (sm.states[j].name == stateName) {
            return sm.states[j]
        }
    }
    // Try to find in children of child states
    for (let j = 0; j < sm.states.length; ++j) {
        const state = sm.states[j];
        if (state.statemachine) {
            const foundState = findStateDeep(state.statemachine, stateName)
            if (foundState)
                return foundState
        }
    }
    return null
}

// Kicks off the state machine by finding its initial state and transitioning to it
export function startStateMachine(sm: IExeStateMachine): void {
    if (!sm.transitions) {
        return
    }
    for (let i = 0; i < sm.transitions.length; ++i) {
        if (sm.transitions[i].from == "initial") {
            const newState = findStateShallow(sm, sm.transitions[i].to) as IStateWithParent
            if (newState) {
                sm.curstate = newState
                return
            }
        }
    }
    // This shouldn't happen on a properly defined statechart
    console.log("WARNING: initial state not specified, proclaiming the first state as initial.");
    //console.log(sm);
    if (sm.states[0])
        sm.curstate = sm.states[0] as IStateWithParent;
    else
        sm.curstate = null;
}

// TODO: more efficient transitioning based on hash-mapped states etc.
function findTransitionRecursive(sm: IExeStateMachine, event: string, fromState: string): any {
    // Look for transitions in current state machine
    if (sm.transitions) {
        for (let i = 0; i < sm.transitions.length; ++i) {
            const transition = sm.transitions[i];
            if (transition.event == event && transition.from == fromState) {
                return transition;
            }
        }
    }
    return null;
}

function findTransitionInHierarchy(currentState: IStateWithParent, event: string): any {
    // Collect all ancestor state names
    let stateNames = [currentState.name];
    let ancestor = currentState.parent;
    while (ancestor && ancestor.name !== 'root') {
        stateNames.push(ancestor.name);
        ancestor = ancestor.parent;
    }
    
    let parent = currentState.parent;
    while (parent && parent.statemachine) {
        // Try transitions from all possible ancestor state names
        for (let stateName of stateNames) {
            let transition = findTransitionRecursive(parent.statemachine as IExeStateMachine, event, stateName);
            if (transition) {
                return { transition, stateMachine: parent.statemachine };
            }
        }
        
        parent = parent.parent;
    }
    return null;
}

export function fireEvent(sm: IExeStateMachine, event: string): void {
    if (!sm.curstate)
        return;
    
    // First try finding transition in the current state's parent
    const parentState = sm.curstate.parent;
    if (parentState && parentState.statemachine) {
        const transition = findTransitionRecursive(parentState.statemachine as IExeStateMachine, event, sm.curstate.name);
        if (transition) {
            sm.curstate = findStateDeep(parentState.statemachine, transition.to) as IStateWithParent || sm.curstate;
            return;
        }
    }
    
    // If not found, search up the hierarchy
    const result = findTransitionInHierarchy(sm.curstate, event);
    if (result) {
        sm.curstate = findStateDeep(result.stateMachine, result.transition.to) as IStateWithParent || sm.curstate;
    }
}

export let root: IStateWithParent = { name: 'root', parent: null, type: 'regular'};

export function addParents(sm: IExeStateMachine, parent: IStateWithParent): void {
    for (let i = 0; i < sm.states.length; ++i) {
        const state = sm.states[i] as IStateWithParent;
        state.parent = parent;
        if (state['statemachine'] != undefined) {
            addParents(state.statemachine as IExeStateMachine, state);
        }
    }
}