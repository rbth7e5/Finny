import { createCRUD, EntityType } from './utils';

export const CATEGORY_ENTITY: EntityType = {
  singular: 'category',
  plural: 'categories',
};

const [createCategories, readCategories, updateCategories, deleteCategories] =
  createCRUD<string>(CATEGORY_ENTITY, category => category);

export { createCategories, readCategories, updateCategories, deleteCategories };
