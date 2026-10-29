// Public runtime surface: no editor, storage, or DOM dependencies.
export {validateRecipe,resolveRecipe,canonical,hash,manifest} from './character-core';
export type {Recipe} from './character-core';
export {buildCharacter,setPose,dispose} from './deformation';
export type {Character,Mesh,Bone,Vec3} from './deformation';
export {visemes,parseVisemeCues,sampleVisemes} from './lipsync';
export type {Viseme,VisemeCue} from './lipsync';
