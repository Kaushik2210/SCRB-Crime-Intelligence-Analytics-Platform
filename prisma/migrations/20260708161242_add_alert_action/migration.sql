-- CreateTable
CREATE TABLE "alert_action" (
    "AlertActionID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "AlertKey" TEXT NOT NULL,
    "Status" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_action_pkey" PRIMARY KEY ("AlertActionID")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_action_UserID_AlertKey_key" ON "alert_action"("UserID", "AlertKey");

-- AddForeignKey
ALTER TABLE "alert_action" ADD CONSTRAINT "alert_action_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "employee"("EmployeeID") ON DELETE RESTRICT ON UPDATE CASCADE;
