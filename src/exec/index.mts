import type {
    IStateMachine,
    IState
} from "../../types/state-machine-cat.d.mts";

export interface IStateWithParent extends IState {
    parent: IStateWithParent | null;
}

// Executable state machine
export interface IExeStateMachine extends IStateMachine {
    curstate: IStateWithParent
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
        if (sm.states[j].hasOwnProperty('statemachine')) {
            const foundState = findStateDeep(sm.states[j].statemachine, stateName)
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
    console.log("WARNING: current state is null.");
    sm.curstate = null
}

// TODO: more efficient transitioning based on hash-mapped states etc.
export function fireEvent(sm: IExeStateMachine, event: string): void {
    const parentState = sm.curstate.parent;
    if (!parentState)
        return;
    if (!parentState.statemachine)
        return;
    if (parentState.statemachine.transitions) {
        for (let i = 0; i < parentState.statemachine.transitions.length; ++i) {
            const transition = parentState.statemachine.transitions[i];
            if (transition.event == event && transition.from == sm.curstate.name) {
                sm.curstate = findStateDeep(parentState.statemachine, transition.to) as IStateWithParent || sm.curstate;
            }
        }
    }
}

export let root: IStateWithParent = { name: 'root', parent: null, type: 'regular' };

export function addParents(sm: IExeStateMachine, parent: IStateWithParent): void {
    for (let i = 0; i < sm.states.length; ++i) {
        const state = sm.states[i] as IStateWithParent;
        state.parent = parent;
        if (state['statemachine'] != undefined) {
            addParents(state.statemachine as IExeStateMachine, state);
        }
    }
}