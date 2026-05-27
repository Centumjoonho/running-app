let introCompleted = false;

export const introSession = {
  isCompleted: () => introCompleted,
  markCompleted: () => {
    introCompleted = true;
  },
};
